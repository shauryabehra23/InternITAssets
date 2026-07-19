import prisma from "../src/lib/prisma";

async function main() {
  const company = await prisma.company.create({
    data: {
      companyCode: 1,
      companyName: "Acme Corp",
      locations: {
        create: {
          locationCode: "LOC001",
          locationName: "Head Office",
        },
      },
    },
  });

  console.log("Seeded company:", company.companyName);
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
