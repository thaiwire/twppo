import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trimStr = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

/**
 * รหัสใหม่ห้ามมีช่องว่างหัวท้าย และห้ามมีอักขระที่ทำให้ URL พัง
 * ตรวจเฉพาะตอนเพิ่ม — รหัสเดิมในระบบมีอักขระพวกนี้อยู่แล้ว ต้องแก้ไขรายการเดิมได้
 */
export const NEW_CODE = /^[^\s/\\?#%][^/\\?#%]*$/;

export class MasterListQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number;
}

// ---------------------------------------------------------------- ผู้ขาย (vd_mstr)

export class VendorDto {
  @trimStr() @IsString() @IsNotEmpty({ message: 'กรุณากรอกรหัสผู้ขาย' }) @MaxLength(24)
  code: string;

  @trimStr() @IsString() @IsNotEmpty({ message: 'กรุณากรอกชื่อผู้ขาย' }) @MaxLength(150) name: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(150) name1?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(150) alias?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(150) line1?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(150) line2?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(150) line3?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(100) tel?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(100) fax?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(30) taxId?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(120) contact?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(120) apContact?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(12) group?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(24) creditTerm?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(9) currency?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(3) vatClass?: string;
  @IsOptional() @IsBoolean() taxable?: boolean;
  @IsOptional() @trimStr() @IsString() @MaxLength(24) apAcct?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @trimStr() @IsString() @MaxLength(120) remark?: string;
}

// ---------------------------------------------------------------- สินค้า (it_mstr)

export class ItemDto {
  @trimStr() @IsString() @IsNotEmpty({ message: 'กรุณากรอกรหัสสินค้า' }) @MaxLength(66)
  code: string;

  @trimStr() @IsString() @IsNotEmpty({ message: 'กรุณากรอกชื่อสินค้า' }) @MaxLength(120) name1: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(120) name2?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(120) ename?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(12) group?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(24) um?: string;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsNumber() @Min(0) stdCost?: number;
  @IsOptional() @IsNumber() @Min(0) curCost?: number;
  @IsOptional() @trimStr() @IsString() @MaxLength(24) vend?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(3) vatClass?: string;
  @IsOptional() @IsBoolean() taxable?: boolean;
  @IsOptional() @IsNumber() @Min(0) minQty?: number;
  @IsOptional() @IsNumber() @Min(0) maxQty?: number;
  @IsOptional() @IsNumber() @Min(0) safetyStock?: number;
  @IsOptional() @trimStr() @IsString() @MaxLength(12) site?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(24) location?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(24) purAcct?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(24) invAcct?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(24) apAcct?: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(150) remark?: string;
}

// ---------------------------------------------------------------- หน่วยงาน (div_mstr)

export class DivisionDto {
  @trimStr() @IsString() @IsNotEmpty({ message: 'กรุณากรอกรหัสหน่วยงาน' }) @MaxLength(24)
  code: string;

  @trimStr() @IsString() @IsNotEmpty({ message: 'กรุณากรอกชื่อหน่วยงาน' }) @MaxLength(60)
  name: string;
}

// ---------------------------------------------------------------- บริษัท (en_mstr)

export class EntityDto {
  @trimStr() @IsString() @IsNotEmpty({ message: 'กรุณากรอกรหัสบริษัท' }) @MaxLength(12)
  code: string;

  @trimStr() @IsString() @IsNotEmpty({ message: 'กรุณากรอกชื่อบริษัท' }) @MaxLength(120) name: string;
  @IsOptional() @trimStr() @IsString() @MaxLength(9) currency?: string;
  @IsOptional() @IsBoolean() primary?: boolean;
}

/** เงื่อนไขออกรายงานข้อมูลหลัก (ใช้ช่องตามประเภทรายงาน — ช่องที่ไม่เกี่ยวจะถูกข้าม) */
export class MasterReportQuery {
  /** check=1: ตรวจเงื่อนไข + นับจำนวนอย่างเดียว (คืน JSON ไม่สร้าง PDF) — ใช้ก่อนเปิดแท็บรายงาน */
  @IsOptional() @IsIn(['1']) check?: '1';
  @IsOptional() @IsString() codeFrom?: string;
  @IsOptional() @IsString() codeTo?: string;
  /** คำค้นหา — รหัสหรือชื่อมีคำนี้ (เหมือนช่องค้นหาในหน้ารายการ) */
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
  @IsOptional() @IsString() group?: string;
  @IsOptional() @IsString() vatClass?: string;
  @IsOptional() @IsString() creditTerm?: string;
  /** ผู้ขายหลัก (รายงานสินค้า) */
  @IsOptional() @IsString() vend?: string;
  @IsOptional() @IsString() site?: string;
  @IsOptional() @IsIn(['code', 'name']) sort?: 'code' | 'name';
}
