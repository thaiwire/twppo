import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const ROLES = ['admin', 'manager', 'user'] as const;
export type Role = (typeof ROLES)[number];

const trimStr = () =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** รูปแบบชื่อผู้ใช้ใหม่ (ตรวจตอนเพิ่มเท่านั้น — ผู้ใช้เดิมอาจมีรูปแบบอื่น) */
export const USERNAME = /^[A-Za-z0-9._@-]{3,50}$/;

/** รหัสผ่าน: 8–72 ตัว มีทั้งตัวอักษรและตัวเลข (bcrypt ใช้ได้ไม่เกิน 72 byte) */
const PASSWORD = /(?=.*[A-Za-z])(?=.*\d)/;

export class UserListQuery {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(ROLES) role?: Role;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
  /** รหัสหน่วยงาน หรือ "-" = ผู้ใช้ที่ไม่ระบุหน่วยงาน */
  @IsOptional() @IsString() div?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number;
}

export class UserDto {
  /** username (ใช้เป็นรหัส — แก้ไขไม่ได้หลังสร้าง) */
  @trimStr()
  @IsString()
  @IsNotEmpty({ message: 'กรุณากรอกชื่อผู้ใช้' })
  @MaxLength(50)
  code: string;

  @trimStr() @IsString() @IsNotEmpty({ message: 'กรุณากรอกชื่อที่แสดง' }) @MaxLength(100)
  displayName: string;

  @IsIn(ROLES, { message: 'ระดับผู้ใช้ต้องเป็น admin, manager หรือ user' })
  role: Role;

  @IsOptional() @IsBoolean() active?: boolean;

  /** หน่วยงาน (div_mstr) — ไม่ระบุ = เห็น PR ทุกหน่วยงาน */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value === null ? undefined : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(24)
  divCode?: string;

  /** ตอนเพิ่ม: บังคับ / ตอนแก้ไข: เว้นว่าง = ไม่เปลี่ยนรหัสผ่าน */
  @Transform(({ value }: { value: unknown }) => (value === '' || value === null ? undefined : value))
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  @MaxLength(72, { message: 'รหัสผ่านยาวได้ไม่เกิน 72 ตัวอักษร' })
  @Matches(PASSWORD, { message: 'รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข' })
  password?: string;
}
