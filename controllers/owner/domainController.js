import dns from "dns";
import Owner from "../../model/OwnerModels.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";

// --- Constants ---
const CNAME_TARGET = process.env.CNAME_TARGET || "shops.tasel.in";
const SERVER_IP = process.env.SERVER_IP || "98.130.142.128";

// --- Helper Functions ---

const verifyDns = async (domainToVerify) => {
  const BASE_DOMAIN = process.env.BASE_DOMAIN || "tasel.in";

  // Bypass DNS check for development domains
  if (domainToVerify === "localhost" || domainToVerify === "www.localhost" || domainToVerify.endsWith(".localhost")) {
    return true;
  }

  // Bypass DNS check for subdomains of the platform's base domain
  // This ensures that subdomains like 'store.tasel.in' are automatically verified
  if (domainToVerify.endsWith(`.${BASE_DOMAIN}`) || domainToVerify === BASE_DOMAIN) {
    return true;
  }
  
  console.log(`🔍 Verifying DNS for: ${domainToVerify}`);

  try {
    // 1. Try resolving CNAME (for subdomains)
    try {
      const cnames = await dns.promises.resolve(domainToVerify, "CNAME");
      // Normalize CNAMEs by removing potential trailing dots (e.g., "shops.tasel.in." -> "shops.tasel.in")
      const normalizedCnames = cnames.map((c) => c.replace(/\.$/, ""));
      
      console.log(`   👉 Found CNAMEs: ${normalizedCnames}. Expected: ${CNAME_TARGET}`);
      
      if (normalizedCnames && normalizedCnames.includes(CNAME_TARGET)) return true;
    } catch (e) {
      // Ignore error if CNAME not found, proceed to check A record
    }

    // 2. Try resolving A Record (for root domains)
    const aRecords = await dns.promises.resolve(domainToVerify, "A");
    console.log(`   👉 Found A Records: ${aRecords}. Expected: ${SERVER_IP}`);
    return aRecords && aRecords.includes(SERVER_IP);
  } catch (error) {
    console.error(`   ❌ DNS Verification Failed: ${error.message}`);
    // Any DNS resolution error means verification fails
    return false;
  }
};

const getDomainStatus = async (hostname) => {
  // Check the hostname exactly as entered first
  let isVerified = await verifyDns(hostname);
  
  // If failed and it's a root domain (no www), try checking www version as fallback
  if (!isVerified && !hostname.startsWith("www.")) {
    console.log(`   ⚠️ Direct check failed, trying www.${hostname}...`);
    isVerified = await verifyDns(`www.${hostname}`);
  }

  return isVerified ? "ACTIVE" : "PENDING";
};

// --- Controller Functions ---

/**
 * @description This endpoint is for Caddy to check if a domain is valid for issuing a certificate.
 * It is unauthenticated and used for automated SSL.
 */
const checkDomain = asyncHandler(async (req, res) => {
  const { domain } = req.query;
  if (!domain) {
    return res
      .status(400)
      .json({ message: "Domain query parameter is required." });
  }

  const cleanDomain = domain.replace(/^www\./, "").toLowerCase();
  const BASE_DOMAIN = process.env.BASE_DOMAIN || "tasel.in";

  // Allow if it matches a valid username subdomain (e.g. username.tasel.in)
  if (cleanDomain.endsWith(`.${BASE_DOMAIN}`)) {
    const username = cleanDomain.slice(0, -(`.${BASE_DOMAIN}`.length));
    const owner = await Owner.findOne({ username });
    if (owner) return res.status(200).send("OK");
  }

  // Find any owner with the domain listed in their storeDomains
  const owner = await Owner.findOne({ storeDomains: cleanDomain });
  if (owner) {
    res.status(200).send("OK");
  } else {
    res.status(404).send("Domain not found.");
  }
});

/**
 * @description Gets all domain-related settings for the owner.
 * This is the primary endpoint for building the domain management UI.
 */
const getDomainSettings = asyncHandler(async (req, res) => {
  const ownerId = req.user.id;
  const owner = await Owner.findById(ownerId).select(
    "primaryDomain storeDomains username"
  );
  if (!owner) {
    throw new ApiError(404, "Owner not found.");
  }

  // Get the status of all domains in parallel
  const domains = await Promise.all(
    owner.storeDomains.map(async (hostname) => ({
      hostname,
      isPrimary: owner.primaryDomain === hostname,
      status: await getDomainStatus(hostname),
    }))
  );

  // Define the DNS records required for configuration
  const dnsRecords = [
    { name: "@", ttl: 3600, type: "A", value: SERVER_IP },
    { name: "www", ttl: 3600, type: "CNAME", value: CNAME_TARGET },
  ];

  const BASE_DOMAIN = process.env.BASE_DOMAIN || "tasel.in";
  const defaultDomain = `${owner.username}.${BASE_DOMAIN}`;

  const response = {
    defaultDomain,
    dnsRecords,
    domains,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, response, "Domain settings retrieved successfully.")
    );
});

/**
 * @description Adds a new domain to the owner's store.
 * This endpoint is idempotent.
 */
const addDomain = asyncHandler(async (req, res) => {
  const { hostname } = req.body;
  const ownerId = req.user.id;

  if (!hostname || !hostname.trim()) {
    throw new ApiError(400, "Hostname is required.");
  }

  const baseHostname = hostname
    .replace(/^www\./, "")
    .toLowerCase()
    .trim();

  const owner = await Owner.findById(ownerId);
  if (!owner) {
    throw new ApiError(404, "Owner not found.");
  }

  // If domain already exists, do nothing and return success.
  if (!owner.storeDomains.includes(baseHostname)) {
    owner.storeDomains.push(baseHostname);
    await owner.save();
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { hostname: baseHostname },
        "Domain added successfully."
      )
    );
});

/**
 * @description Sets a given domain as the primary domain for the store.
 * The domain must already be added and verified.
 */
const setPrimaryDomain = asyncHandler(async (req, res) => {
  const { hostname } = req.body;
  const ownerId = req.user.id;

  if (!hostname) {
    throw new ApiError(400, "Hostname is required.");
  }

  const owner = await Owner.findById(ownerId);
  if (!owner) {
    throw new ApiError(404, "Owner not found.");
  }

  // Ensure the domain is one of the owner's domains
  if (!owner.storeDomains.includes(hostname)) {
    throw new ApiError(
      400,
      "This domain must be added to your store before it can be set as primary."
    );
  }

  // Ensure the domain is verified before making it primary
  const status = await getDomainStatus(hostname);
  if (status !== "ACTIVE") {
    throw new ApiError(
      400,
      "Domain must be verified with an ACTIVE status before it can be set as primary."
    );
  }

  owner.primaryDomain = hostname;
  await owner.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { primaryDomain: hostname },
        "Primary domain updated successfully."
      )
    );
});

/**
 * @description Deletes a domain from the owner's store.
 */
const deleteDomain = asyncHandler(async (req, res) => {
  const { hostname } = req.query;
  const ownerId = req.user.id;

  if (!hostname) {
    throw new ApiError(400, "Hostname query parameter is required.");
  }

  const owner = await Owner.findById(ownerId);
  if (!owner) {
    throw new ApiError(404, "Owner not found.");
  }

  const baseHostname = hostname.toLowerCase().trim();

  if (!owner.storeDomains.includes(baseHostname)) {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "Domain not found in your store."));
  }

  // Remove the domain
  owner.storeDomains = owner.storeDomains.filter((d) => d !== baseHostname);

  // If the deleted domain was the primary one, reset primaryDomain.
  if (owner.primaryDomain === baseHostname) {
    owner.primaryDomain = null;
  }

  await owner.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Domain removed successfully."));
});

/**
 * @description Verifies the DNS status of a specific domain.
 */
const verifyDomain = asyncHandler(async (req, res) => {
  const { hostname } = req.body;
  
  if (!hostname) {
    throw new ApiError(400, "Hostname is required for verification.");
  }

  const status = await getDomainStatus(hostname);
  
  return res.status(200).json(
    new ApiResponse(
      200,
      { hostname, status },
      `Domain verification completed. Status: ${status}`
    )
  );
});

export {
  addDomain,
  checkDomain,
  deleteDomain,
  getDomainSettings,
  setPrimaryDomain,
  verifyDomain,
};
