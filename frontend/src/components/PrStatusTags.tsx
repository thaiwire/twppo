import { Space, Tag } from "antd";

export default function PrStatusTags({ status, approved }: { status: string; approved: boolean }) {
  return (
    <Space size={4}>
      {status === "C" ? <Tag>ปิด</Tag> : <Tag color="blue">เปิด</Tag>}
      {approved ? <Tag color="green">อนุมัติแล้ว</Tag> : <Tag color="orange">รออนุมัติ</Tag>}
    </Space>
  );
}
