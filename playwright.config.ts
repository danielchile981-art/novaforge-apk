import {defineConfig} from "@playwright/test";
export default defineConfig({
 testDir:"tests/browser",fullyParallel:true,workers:3,timeout:45000,
 reporter:[["list"],["html",{open:"never"}]],
 use:{baseURL:"http://127.0.0.1:4173",viewport:{width:412,height:915},headless:true,screenshot:"only-on-failure",trace:"retain-on-failure"},
 webServer:{command:"npm run samples && npm run build && node scripts/test-server.mjs",url:"http://127.0.0.1:4173",timeout:120000,reuseExistingServer:!process.env.CI}
});
