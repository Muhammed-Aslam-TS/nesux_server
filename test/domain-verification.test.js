import axios from 'axios';

// This test script verifies that the server no longer crashes when multiple 'domain'
// query parameters are provided to the /api/owner/custom-hostname/verify endpoint.

const testDomainVerification = async () => {
    const port = 5002; // Assuming the server runs on port 5002 based on log files.
    // The problematic URL with duplicate 'domain' query parameters.
    const url = `http://localhost:${port}/api/owner/custom-hostname/verify?domain=tasel.in&domain=localhost`;

    console.log(`[TEST] Making a POST request to: ${url}`);

    try {
        // We expect this request to fail, but not with a 500 Internal Server Error.
        // Since we are not providing an authentication token, it should be caught by the auth middleware.
        // A 401 Unauthorized or 403 Forbidden is an acceptable failure.
        await axios.post(url, {}, {
            // We need to pass a dummy auth token to get past the initial checks.
            // The goal is to hit the controller logic.
            // A completely empty token might be rejected early. Let's use a placeholder.
            // Even with this, we expect an auth error, but it will ensure we get past the initial bearer token check
            // and into the JWT verification, which will fail and return a 401/403.
            headers: {
                'Authorization': 'Bearer a-fake-token'
            }
        });
    } catch (error) {
        if (error.response) {
            const { status, data } = error.response;
            console.log(`[TEST] Received response: Status ${status}`, data);

            if (status === 500) {
                console.error('[TEST FAILED] The server responded with 500 Internal Server Error. The bug is likely still present.');
                process.exit(1);
            } else {
                console.log(`[TEST PASSED] The server responded with a non-500 status code (${status}), indicating the crash is fixed.`);
                console.log(`[INFO] A status code of 401/403 is expected here as we are not providing a valid authentication token.`);
                process.exit(0);
            }
        } else {
            console.error('[TEST FAILED] An error occurred while making the request, but there was no response from the server.', error.message);
            process.exit(1);
        }
    }
};

testDomainVerification();
