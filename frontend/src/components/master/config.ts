/** ค่าคงที่ของหน้าข้อมูลหลักแต่ละประเภท (ใช้ร่วมกันระหว่างหน้า รายการ / เพิ่ม / แก้ไข) */
export const MASTER = {
  vendors: { title: "ผู้ขาย", endpoint: "/admin/vendors", basePath: "/master/vendors", reportPath: "/reports/vendors" },
  items: { title: "รหัสสินค้า", endpoint: "/admin/items", basePath: "/master/items", reportPath: "/reports/items" },
  divisions: { title: "หน่วยงาน", endpoint: "/admin/divisions", basePath: "/master/divisions", reportPath: "/reports/divisions" },
  entities: { title: "บริษัท", endpoint: "/admin/entities", basePath: "/master/entities", reportPath: "/reports/entities" },
} as const;

/** ผู้ใช้งาน (เมนู Admin) — ใช้หน้า list/form แบบเดียวกับข้อมูลหลัก โดยใช้ username เป็นรหัส */
export const USERS = { title: "ผู้ใช้งาน", endpoint: "/admin/users", basePath: "/admin/users" } as const;
