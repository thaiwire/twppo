import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PrLineDto {
  @IsOptional() @IsString() @MaxLength(60) part?: string;
  @IsString() @IsNotEmpty() @MaxLength(120) desc: string;
  @IsOptional() @IsString() @MaxLength(9) um?: string;
  @IsNumber() @Min(0.0001) qty: number;
  @IsNumber() @Min(0) price: number;
}

export class SavePrDto {
  @IsDateString() prDate: string;
  @IsOptional() @IsDateString() needDate?: string;
  @IsString() @IsNotEmpty() @MaxLength(24) vend: string;
  @IsOptional() @IsString() @MaxLength(24) request?: string;
  @IsString() @IsNotEmpty() @MaxLength(12) entity: string;
  @IsOptional() @IsString() @MaxLength(120) remark?: string;
  @IsOptional() @IsString() @MaxLength(120) remark1?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) discPct?: number;
  @IsOptional() @IsBoolean() taxable?: boolean;
  @IsOptional() @IsString() @MaxLength(3) vatClass?: string;
  /** หน่วยงาน — ผู้ใช้ที่มีหน่วยงานจะถูกบังคับเป็นหน่วยงานของตัวเอง */
  @IsOptional() @IsString() @MaxLength(24) divCode?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'ต้องมีรายการสินค้าอย่างน้อย 1 รายการ' })
  @ValidateNested({ each: true })
  @Type(() => PrLineDto)
  lines: PrLineDto[];
}

export class ListPrQuery {
  @IsOptional() @IsString() q?: string;
  /** กรองหน่วยงาน (ใช้ได้เฉพาะผู้ใช้ที่ไม่จำกัดหน่วยงาน) — "-" = PR ที่ยังไม่ระบุหน่วยงาน */
  @IsOptional() @IsString() div?: string;
  @IsOptional() @IsIn(['O', 'C']) status?: 'O' | 'C';
  @IsOptional() @IsIn(['Y', 'N']) approve?: 'Y' | 'N';
  @IsOptional() @IsString() entity?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number;
}

/** เงื่อนไขพิมพ์ใบเสนอซื้อ (พิมพ์ได้หลายใบในไฟล์เดียว) */
export class PrPrintQuery {
  @IsOptional() @IsString() div?: string;
  /** check=1: ตรวจเงื่อนไข + นับจำนวนอย่างเดียว (คืน JSON ไม่สร้าง PDF) — ใช้ก่อนเปิดแท็บรายงาน */
  @IsOptional() @IsIn(['1']) check?: '1';
  @IsOptional() @IsString() nbrFrom?: string;
  @IsOptional() @IsString() nbrTo?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsString() vend?: string;
  @IsOptional() @IsString() entity?: string;
  @IsOptional() @IsIn(['O', 'C']) status?: 'O' | 'C';
  @IsOptional() @IsIn(['Y', 'N']) approve?: 'Y' | 'N';
}
