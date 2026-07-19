-- CreateTable
CREATE TABLE "company" (
    "company_code" INTEGER NOT NULL,
    "company_name" TEXT NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("company_code")
);

-- CreateTable
CREATE TABLE "location" (
    "location_id" SERIAL NOT NULL,
    "company_code" INTEGER NOT NULL,
    "location_code" TEXT NOT NULL,
    "location_name" TEXT,

    CONSTRAINT "location_pkey" PRIMARY KEY ("location_id")
);

-- CreateTable
CREATE TABLE "asset_class" (
    "asset_class_code" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "asset_class_pkey" PRIMARY KEY ("asset_class_code")
);

-- CreateTable
CREATE TABLE "vendor" (
    "vendor_code" INTEGER NOT NULL,
    "vendor_name" TEXT NOT NULL,

    CONSTRAINT "vendor_pkey" PRIMARY KEY ("vendor_code")
);

-- CreateTable
CREATE TABLE "app_user" (
    "user_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "department" TEXT,
    "is_person" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "asset" (
    "asset_id" SERIAL NOT NULL,
    "company_code" INTEGER NOT NULL,
    "asset_number" TEXT NOT NULL,
    "asset_class_code" INTEGER,
    "location_id" INTEGER,
    "vendor_code" INTEGER,
    "description" TEXT,
    "serial_number" TEXT,
    "local_reference" TEXT,
    "capitalized_on" DATE,
    "acquisition_year" INTEGER,
    "apc_value" DECIMAL(14,2),
    "book_value" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "uom" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "remarks" TEXT,
    "other_remarks" TEXT,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("asset_id")
);

-- CreateTable
CREATE TABLE "asset_assignment" (
    "assignment_id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "assigned_on" DATE,
    "returned_on" DATE,
    "remarks" TEXT,

    CONSTRAINT "asset_assignment_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_company_code_location_code_key" ON "location"("company_code", "location_code");

-- CreateIndex
CREATE UNIQUE INDEX "asset_company_code_asset_number_description_key" ON "asset"("company_code", "asset_number", "description");

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_company_code_fkey" FOREIGN KEY ("company_code") REFERENCES "company"("company_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_company_code_fkey" FOREIGN KEY ("company_code") REFERENCES "company"("company_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("location_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_asset_class_code_fkey" FOREIGN KEY ("asset_class_code") REFERENCES "asset_class"("asset_class_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_vendor_code_fkey" FOREIGN KEY ("vendor_code") REFERENCES "vendor"("vendor_code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignment" ADD CONSTRAINT "asset_assignment_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "asset"("asset_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignment" ADD CONSTRAINT "asset_assignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
