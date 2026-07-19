import prisma from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function excelSerialToDate(serial: number): Date {
  return new Date((serial - 25569) * 86400000);
}

function parseDateDDMMYYYY(s: string): Date | null {
  if (!s || typeof s !== "string") return null;
  const parts = s.split(".");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd);
}

function parseNumericValue(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  const s = String(v).replace(/,/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

async function main() {
  const componentsDir = path.resolve(__dirname, "../src/components");

  // ── Read Excel files ──────────────────────────────────────────────
  const wbData = XLSX.readFile(path.join(componentsDir, "data.xlsx"));
  const wsData = wbData.Sheets["Sheet1"];
  const rowsData: any[] = XLSX.utils.sheet_to_json(wsData);

  const wbArun = XLSX.readFile(path.join(componentsDir, "Assets 09.09.2025 Arun.xlsx"));
  const wsArun = wbArun.Sheets["Sheet1"];
  const rowsArun: any[] = XLSX.utils.sheet_to_json(wsArun);

  console.log(`Read ${rowsData.length} rows from data.xlsx`);
  console.log(`Read ${rowsArun.length} rows from Assets 09.09.2025 Arun.xlsx`);

  // ── Extract unique entities ────────────────────────────────────────
  const companyMap = new Map<number, string>();
  const locationMap = new Map<string, { code: number; name: string }>();
  const assetClassSet = new Set<number>();
  const vendorMap = new Map<number, string>();

  for (const r of rowsData) {
    if (r.CoCd) companyMap.set(r.CoCd, r["Co Name"]);
    const locKey = `${r.CoCd}-${r.Location}`;
    if (r.Location && !locationMap.has(locKey)) {
      locationMap.set(locKey, { code: r.Location, name: r["Location_1"] || `Location ${r.Location}` });
    }
    if (r.Vendor) vendorMap.set(r.Vendor, `Vendor ${r.Vendor}`);
  }

  for (const r of rowsArun) {
    if (r["Company Code"]) companyMap.set(r["Company Code"], r["Company Name"]);
    const locKey = `${r["Company Code"]}-${r.Location}`;
    if (r.Location && !locationMap.has(locKey)) {
      locationMap.set(locKey, { code: r.Location, name: r["Location Name"] || `Location ${r.Location}` });
    }
    if (r["Asset Class"]) assetClassSet.add(Number(r["Asset Class"]));
  }

  // Give vendorMap real names
  vendorMap.set(500478, "Dell Technologies");
  vendorMap.set(300167, "HP Inc.");
  vendorMap.set(200027, "Lenovo");

  console.log(`\nExtracted: ${companyMap.size} companies, ${locationMap.size} locations, ${assetClassSet.size} asset classes, ${vendorMap.size} vendors`);

  // ── Seed Company ──────────────────────────────────────────────────
  // Keep existing Acme Corp (code=1) if present, plus add Excel companies
  const existingCompany = await prisma.company.findUnique({ where: { companyCode: 1 } });
  if (!existingCompany) {
    await prisma.company.create({
      data: { companyCode: 1, companyName: "Acme Corp" },
    });
    console.log("Created Acme Corp");
  }

  for (const [code, name] of companyMap) {
    const existing = await prisma.company.findUnique({ where: { companyCode: code } });
    if (!existing) {
      await prisma.company.create({ data: { companyCode: code, companyName: name } });
      console.log(`Created company: ${name} (${code})`);
    }
  }

  // ── Seed Locations ────────────────────────────────────────────────
  // Keep existing Acme location
  const existingLoc = await prisma.location.findFirst({
    where: { companyCode: 1, locationCode: "LOC001" },
  });
  if (!existingLoc) {
    await prisma.location.create({
      data: { companyCode: 1, locationCode: "LOC001", locationName: "Head Office" },
    });
    console.log("Created location: Head Office");
  }

  for (const [key, loc] of locationMap) {
    const existing = await prisma.location.findUnique({
      where: { companyCode_locationCode: { companyCode: 1, locationCode: String(loc.code) } },
    }).catch(() => null);
    if (!existing) {
      // Determine which company this location belongs to
      // For simplicity, assign location to company 1 (Acme) for Excel locations
      // But use the first companyCode we find for it
      const firstCompanyId = [...companyMap.keys()][0];
      const companyCode = firstCompanyId || 1;
      try {
        await prisma.location.create({
          data: {
            companyCode,
            locationCode: String(loc.code),
            locationName: loc.name,
          },
        });
        console.log(`Created location: ${loc.name} (${loc.code}) for company ${companyCode}`);
      } catch (e: any) {
        if (e.code === "P2002") {
          // Unique constraint violation, skip
        } else {
          console.error(`Failed to create location ${loc.name}:`, e.message);
        }
      }
    }
  }

  // ── Seed Asset Classes ────────────────────────────────────────────
  for (const classCode of assetClassSet) {
    const existing = await prisma.assetClass.findUnique({ where: { assetClassCode: classCode } });
    if (!existing) {
      await prisma.assetClass.create({
        data: { assetClassCode: classCode, description: `Asset Class ${classCode}` },
      });
      console.log(`Created asset class: ${classCode}`);
    }
  }

  // ── Seed Vendors ──────────────────────────────────────────────────
  for (const [code, name] of vendorMap) {
    const existing = await prisma.vendor.findUnique({ where: { vendorCode: code } });
    if (!existing) {
      await prisma.vendor.create({ data: { vendorCode: code, vendorName: name } });
      console.log(`Created vendor: ${name} (${code})`);
    }
  }

  // ── Seed Users ────────────────────────────────────────────────────
  const existingAdmin = await prisma.appUser.findFirst({ where: { email: "admin@acme.com" } });
  let adminUserId: number;

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = await prisma.appUser.create({
      data: {
        fullName: "Admin User",
        email: "admin@acme.com",
        password: hashedPassword,
        role: "admin",
      },
    });
    adminUserId = admin.userId;
    console.log("Created admin user");
  } else {
    adminUserId = existingAdmin.userId;
  }

  const existingStaff = await prisma.appUser.findFirst({ where: { email: "staff@acme.com" } });
  if (!existingStaff) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.appUser.create({
      data: {
        fullName: "Staff User",
        email: "staff@acme.com",
        password: hashedPassword,
        role: "staff",
      },
    });
    console.log("Created staff user");
  }

  // ── Seed Assets from data.xlsx ────────────────────────────────────
  let assetCount = 0;
  for (const r of rowsData) {
    const companyCode = r.CoCd;
    const assetNumber = String(r.Asset);
    if (!companyCode || !assetNumber) continue;

    const existing = await prisma.asset.findUnique({
      where: { companyCode_assetNumber: { companyCode, assetNumber } },
    }).catch(() => null);
    if (existing) continue;

    const capitalizedOn = parseDateDDMMYYYY(r["Created on"]);

    // Find location - for data.xlsx, location code is 1 per company
    let locationId: number | null = null;
    const loc = await prisma.location.findFirst({
      where: { companyCode, locationCode: String(r.Location || 1) },
    });
    if (loc) locationId = loc.locationId;

    let apcValue: number | null = null;
    if (r["APC Value "] != null) {
      apcValue = parseNumericValue(r["APC Value "]);
    }

    const quantity = parseNumericValue(r["   Quantity"] || r.Quantity) || 1;

    try {
      await prisma.asset.create({
        data: {
          companyCode,
          assetNumber,
          description: r["Asset description"] || null,
          localReference: r["Local reference"] || null,
          serialNumber: r["Serial Number"] || null,
          acquisitionYear: r.AcqY || null,
          capitalizedOn: capitalizedOn || undefined,
          apcValue: apcValue || undefined,
          quantity: quantity,
          currency: "INR",
          uom: r.BUn || null,
          locationId: locationId || undefined,
          vendorCode: r.Vendor || undefined,
          createdBy: adminUserId,
        },
      });
      assetCount++;
    } catch (e: any) {
      if (e.code === "P2002") {
        // Duplicate, skip
      } else {
        console.error(`Failed to create asset ${assetNumber}:`, e.message);
      }
    }
  }
  console.log(`Seeded ${assetCount} assets from data.xlsx`);

  // ── Seed Assets from Arun.xlsx ────────────────────────────────────
  let arunCount = 0;
  for (const r of rowsArun) {
    const companyCode = r["Company Code"];
    const assetNumber = String(r.Asset);
    if (!companyCode || !assetNumber) continue;

    const existing = await prisma.asset.findUnique({
      where: { companyCode_assetNumber: { companyCode, assetNumber } },
    }).catch(() => null);
    if (existing) continue;

    let capitalizedOn: Date | null = null;
    if (r["Capitalized on"]) {
      const v = Number(r["Capitalized on"]);
      capitalizedOn = excelSerialToDate(v);
    }

    const locationCode = String(r.Location || 1);
    let locationId: number | null = null;

    // Find or create location for this company
    let loc = await prisma.location.findFirst({
      where: { companyCode, locationCode },
    });
    if (!loc) {
      try {
        loc = await prisma.location.create({
          data: {
            companyCode,
            locationCode,
            locationName: r["Location Name"] || null,
          },
        });
      } catch (e: any) {
        // If unique constraint fails, try to find it
        if (e.code === "P2002") {
          loc = await prisma.location.findFirst({
            where: { companyCode, locationCode },
          });
        }
      }
    }
    if (loc) locationId = loc.locationId;

    const assetClassCode = r["Asset Class"] ? Number(r["Asset Class"]) : null;

    const bookValue = parseNumericValue(r["Book val."]);

    try {
      await prisma.asset.create({
        data: {
          companyCode,
          assetNumber,
          description: r["Asset description"] || null,
          capitalizedOn: capitalizedOn || undefined,
          bookValue: bookValue || undefined,
          currency: r.Currency || "INR",
          assetClassCode: assetClassCode || undefined,
          locationId: locationId || undefined,
          remarks: r.Remarks || null,
          otherRemarks: r["Other Remarks"] || null,
          quantity: 1,
          createdBy: adminUserId,
        },
      });
      arunCount++;
    } catch (e: any) {
      if (e.code === "P2002") {
        // Duplicate, skip
      } else {
        console.error(`Failed to create asset ${assetNumber}:`, e.message);
      }
    }
  }
  console.log(`Seeded ${arunCount} assets from Arun.xlsx`);

  // ── Summary ───────────────────────────────────────────────────────
  const totalCompanies = await prisma.company.count();
  const totalLocations = await prisma.location.count();
  const totalAssetClasses = await prisma.assetClass.count();
  const totalVendors = await prisma.vendor.count();
  const totalUsers = await prisma.appUser.count();
  const totalAssets = await prisma.asset.count();

  console.log("\n=== Seed Summary ===");
  console.log(`Companies:  ${totalCompanies}`);
  console.log(`Locations:  ${totalLocations}`);
  console.log(`Asset Classes: ${totalAssetClasses}`);
  console.log(`Vendors:    ${totalVendors}`);
  console.log(`Users:      ${totalUsers}`);
  console.log(`Assets:     ${totalAssets}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
