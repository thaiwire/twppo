import type { ModuleAccess } from "./modules";

export interface Me {
  id: number;
  username: string;
  displayName: string;
  role: string;
  /** หน่วยงานของผู้ใช้ — มีค่า = เห็นเฉพาะ PR ของหน่วยงานนี้ / null = เห็นทุกหน่วยงาน */
  divCode: string | null;
  /** สิทธิ์ module ที่มีผลจริง เช่น { pr: "manager" } (admin ได้ manager ทุก module) — ตรวจด้วย can() ใน lib/modules */
  modules: ModuleAccess;
  /** เห็นเมนู Admin (จัดการผู้ใช้) — role admin เท่านั้น */
  isAdmin: boolean;
}

export interface Vendor {
  code: string;
  name: string;
  vatClass: string;
  taxable: boolean;
  status: string;
}

export interface Item {
  code: string;
  name: string;
  um: string;
  price: number;
}

export interface Entity {
  code: string;
  name: string;
  primary: boolean;
}

export interface Division {
  code: string;
  name: string;
}

export interface VatClass {
  code: string;
  desc: string;
  pct: number;
  primary: boolean;
}

export interface PrListItem {
  nbr: string;
  prDate: string | null;
  needDate: string | null;
  vend: string;
  vendName: string;
  request: string;
  entity: string;
  divCode: string;
  remark: string;
  status: "O" | "C";
  approved: boolean;
  lineCount: number;
  amount: number;
  net: number;
  createdBy: string;
}

export interface PrLine {
  line: number;
  part: string;
  desc: string;
  /** หมายเหตุรายการ 2 บรรทัด */
  rmk: string;
  rmk1: string;
  um: string;
  qty: number;
  price: number;
  amount: number;
  qtyOrdered: number;
  status: string;
}

export interface PrTotals {
  subtotal: number;
  discPct: number;
  discAmt: number;
  afterDisc: number;
  vatPct: number;
  vatAmt: number;
  net: number;
}

export interface PrDetail {
  nbr: string;
  prDate: string | null;
  needDate: string | null;
  vend: string;
  vendor: {
    code: string;
    name: string;
    address: string;
    tel: string;
    fax: string;
    contact: string;
  } | null;
  request: string;
  entity: string;
  entityName: string;
  divCode: string;
  divName: string;
  remark: string;
  remark1: string;
  status: "O" | "C";
  approved: boolean;
  approvedBy: string;
  taxable: boolean;
  vatClass: string;
  vatDesc: string;
  createdBy: string;
  updatedAt: string;
  lines: PrLine[];
  totals: PrTotals;
  locked: boolean;
}

export interface SavePrInput {
  prDate: string;
  needDate?: string;
  vend: string;
  request?: string;
  entity: string;
  remark?: string;
  remark1?: string;
  discPct?: number;
  taxable?: boolean;
  vatClass?: string;
  divCode?: string;
  lines: { part?: string; desc: string; rmk?: string; rmk1?: string; um?: string; qty: number; price: number }[];
}

export interface Paged<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

// ---------------------------------------------------------------- ข้อมูลหลัก (admin/manager)

export interface VendorRecord {
  code: string;
  name: string;
  name1: string;
  alias: string;
  line1: string;
  line2: string;
  line3: string;
  tel: string;
  fax: string;
  taxId: string;
  contact: string;
  apContact: string;
  group: string;
  creditTerm: string;
  currency: string;
  vatClass: string;
  taxable: boolean;
  apAcct: string;
  active: boolean;
  remark: string;
  updatedBy: string;
  updatedAt: string;
}

export interface ItemRecord {
  code: string;
  name1: string;
  name2: string;
  ename: string;
  group: string;
  um: string;
  price: number;
  stdCost: number;
  curCost: number;
  vend: string;
  vatClass: string;
  taxable: boolean;
  minQty: number;
  maxQty: number;
  safetyStock: number;
  site: string;
  location: string;
  purAcct: string;
  invAcct: string;
  apAcct: string;
  remark: string;
  updatedBy: string;
  updatedAt: string;
}

export interface DivisionRecord {
  code: string;
  name: string;
  userCount: number;
  prCount: number;
  updatedBy: string;
  updatedAt: string;
}

export interface EntityRecord {
  code: string;
  name: string;
  currency: string;
  primary: boolean;
  updatedBy: string;
  updatedAt: string;
}

export interface AdminLookups {
  vendorGroups: string[];
  creditTerms: string[];
  currencies: string[];
  itemGroups: string[];
  sites: string[];
  units: string[];
  defaults: {
    vdApAcct: string | null;
    currency: string | null;
    site: string | null;
    itPurAcct: string | null;
    itInvAcct: string | null;
    itApAcct: string | null;
  };
}

// ---------------------------------------------------------------- ผู้ใช้งาน (admin)

/** admin = ผู้ดูแลระบบ (ทุก module) / user = ใช้งานตามสิทธิ์ module */
export type UserRole = "admin" | "user";

export interface UserRecord {
  /** = username (ใช้เป็นรหัสของรายการ) */
  code: string;
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  modules: ModuleAccess;
  active: boolean;
  divCode: string | null;
  divName: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}
