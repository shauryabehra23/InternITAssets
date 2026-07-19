import { defineComputeConfig } from "@prisma/compute-sdk/config";

export default defineComputeConfig({
  app: {
    name: "assetsdb",
    framework: "nextjs",
    env: ".env",
  },
});
