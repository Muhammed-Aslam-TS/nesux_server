/* eslint-disable no-undef */
import Owner from "../../model/OwnerModels.js";

let cachedDefaultOwner = null;

export const tenantMiddleware = async (req, res, next) => {
  try {
    const host = req.query?.domain || req.get("host"); // Allow query param override (e.g. ?domain=localhost)
    let hostname = host?.split(":")[0];
    if (hostname) hostname = hostname.replace(/^www\./, "").toLowerCase();

    if (!hostname) {
      console.warn("[Tenant] No hostname found in request.");
      return res.status(400).json({ message: "Invalid Host header" });
    }

    console.log(`[Tenant] Resolving for hostname: ${hostname}`);

    // 1. Try to find the owner in DB
    let owner = await Owner.findByHost(hostname);

    if (owner) {
      console.log(`[Tenant] Found owner: ${owner.username} (${owner._id})`);
      req.owner = owner;
      res.locals.owner = owner;

      // --- Shopify-style Primary Domain Redirection ---
      const primaryDomain = owner.primaryDomain;
      const isLocal = hostname === 'localhost' || 
                      hostname.endsWith('.localhost') || 
                      hostname.startsWith('127.') ||
                      hostname.startsWith('192.168.') ||
                      hostname.startsWith('10.') ||
                      hostname.startsWith('172.');
                      
      const isApiRequest = req.originalUrl.startsWith('/api');

      if (!isLocal && !isApiRequest && primaryDomain && hostname !== primaryDomain && hostname !== `www.${primaryDomain}`) {
          const protocol = req.protocol || 'https';
          console.log(`[Tenant] Redirecting to primary domain: ${primaryDomain}`);
          return res.redirect(301, `${protocol}://${primaryDomain}${req.originalUrl}`);
      }

      return next();
    }

    // 2. If NO owner found, check if it's a allowed "Platform" domain
    const BASE_DOMAIN = process.env.BASE_DOMAIN || "tasel.in";
    const SERVER_IP = process.env.SERVER_IP || "98.130.142.128";
    
    // Check if it's a platform domain (Allow localhost, 127.x.x.x, and 192.168.x.x)
    const isLocalIp = hostname.startsWith('127.') || hostname.startsWith('192.168.');
    if (hostname === BASE_DOMAIN || hostname === SERVER_IP || hostname === 'localhost' || isLocalIp) {
       console.log(`[Tenant] Platform/Local domain detected (${hostname}). Using default resolution.`);
       // [DEV FALLBACK] If localhost or local network IP, try to find a default owner to allow Public APIs to work
       // This fixes "No ownerId found" errors during local development when hostname isn't in DB
       if (hostname === 'localhost' || isLocalIp) {
           if (!cachedDefaultOwner) {
               console.log(`[Tenant] Fetching default owner for local development...`);
               cachedDefaultOwner = await Owner.findOne().sort({ createdAt: 1 });
               if (cachedDefaultOwner) {
                   console.log(`[Tenant] Default owner cached: ${cachedDefaultOwner.username}`);
               }
           }
           
           if (cachedDefaultOwner) {
               console.log(`[Tenant] Resolving request via default owner: ${cachedDefaultOwner.username}`);
               req.owner = cachedDefaultOwner;
               res.locals.owner = cachedDefaultOwner;
           } else {
               console.warn(`[Tenant] No owners found in database! Public APIs may return 404.`);
           }
       }
       return next();
    }

    // 3. If clearly not a known store and not the platform -> 404
    console.warn(`[Tenant] Store not found for hostname: ${hostname}`);
    return res.status(404).json({ message: "Store not found" });

  } catch (error) {
    console.error("[Tenant Fatal Error]:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error during tenant resolution",
      error: error.message 
    });
  }
};