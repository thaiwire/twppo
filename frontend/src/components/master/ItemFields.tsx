"use client";

import { AutoComplete, Col, Divider, Form, Input, InputNumber, Row, Select, Switch } from "antd";
import { useMemo } from "react";
import VendorSelect from "@/components/VendorSelect";
import { toOptions, useAdminLookups } from "@/lib/adminLookups";
import { useMaster } from "@/lib/master";
import { useNewDefaults } from "./useNewDefaults";

const money = {
  min: 0,
  precision: 2,
  style: { width: "100%" },
  formatter: (v: string | number | undefined) => `${v ?? ""}`.replace(/\B(?=(\d{3})+(?!\d))/g, ","),
  parser: (v: string | undefined) => Number((v ?? "").replace(/,/g, "")) as 0,
};

const containsFilter = {
  filterOption: (input: string, o?: { value?: unknown }) =>
    String(o?.value ?? "").toLowerCase().includes(input.toLowerCase()),
};

const section = (text: string) => (
  <Divider titlePlacement="start" style={{ margin: "8px 0 16px" }}>
    {text}
  </Divider>
);

/** ช่องกรอกข้อมูลสินค้า (it_mstr) */
export default function ItemFields({ editing }: { editing: boolean }) {
  const lk = useAdminLookups();
  const master = useMaster();

  const defaults = useMemo(
    () =>
      lk && master
        ? {
            taxable: true,
            price: 0,
            stdCost: 0,
            curCost: 0,
            minQty: 0,
            maxQty: 0,
            safetyStock: 0,
            vatClass: master.vatClasses.find((v) => v.primary)?.code,
            site: lk.defaults.site,
            purAcct: lk.defaults.itPurAcct,
            invAcct: lk.defaults.itInvAcct,
            apAcct: lk.defaults.itApAcct,
          }
        : null,
    [lk, master],
  );
  useNewDefaults(editing, defaults);

  return (
    <>
      {section("ข้อมูลทั่วไป")}
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item name="code" label="รหัสสินค้า" rules={[{ required: true, whitespace: true, message: "กรุณากรอกรหัส" }]}>
            <Input maxLength={66} disabled={editing} autoFocus={!editing} />
          </Form.Item>
        </Col>
        <Col xs={24} md={16}>
          <Form.Item name="name1" label="ชื่อสินค้า" rules={[{ required: true, whitespace: true, message: "กรุณากรอกชื่อ" }]}>
            <Input maxLength={120} autoFocus={editing} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="name2" label="ชื่อสินค้า (บรรทัด 2)">
            <Input maxLength={120} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="ename" label="ชื่อภาษาอังกฤษ">
            <Input maxLength={120} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="group" label="กลุ่มสินค้า">
            <AutoComplete options={toOptions(lk?.itemGroups)} maxLength={12} showSearch={containsFilter} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="um" label="หน่วยนับ">
            <AutoComplete options={toOptions(lk?.units)} maxLength={24} showSearch={containsFilter} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="vend" label="ผู้ขายหลัก">
            <VendorSelect />
          </Form.Item>
        </Col>
      </Row>

      {section("ราคา / ภาษี")}
      <Row gutter={16}>
        <Col xs={12} md={6}>
          <Form.Item name="price" label="ราคา">
            <InputNumber {...money} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="stdCost" label="ต้นทุนมาตรฐาน">
            <InputNumber {...money} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="curCost" label="ต้นทุนล่าสุด">
            <InputNumber {...money} />
          </Form.Item>
        </Col>
        <Col xs={6} md={3}>
          <Form.Item name="vatClass" label="ภาษี">
            <Select allowClear options={master?.vatClasses.map((v) => ({ value: v.code, label: v.code }))} />
          </Form.Item>
        </Col>
        <Col xs={6} md={3}>
          <Form.Item name="taxable" label="คิดภาษี" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
      </Row>

      {section("คลัง / บัญชี")}
      <Row gutter={16}>
        <Col xs={8} md={4}>
          <Form.Item name="minQty" label="Min">
            <InputNumber {...money} />
          </Form.Item>
        </Col>
        <Col xs={8} md={4}>
          <Form.Item name="maxQty" label="Max">
            <InputNumber {...money} />
          </Form.Item>
        </Col>
        <Col xs={8} md={4}>
          <Form.Item name="safetyStock" label="Safety stock">
            <InputNumber {...money} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="site" label="Site">
            <AutoComplete options={toOptions(lk?.sites)} maxLength={12} />
          </Form.Item>
        </Col>
        <Col xs={12} md={6}>
          <Form.Item name="location" label="ที่เก็บ (Location)">
            <Input maxLength={24} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="purAcct" label="บัญชีซื้อ">
            <Input maxLength={24} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="invAcct" label="บัญชีสินค้าคงคลัง">
            <Input maxLength={24} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item name="apAcct" label="บัญชีเจ้าหนี้">
            <Input maxLength={24} />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="remark" label="หมายเหตุ">
        <Input maxLength={150} />
      </Form.Item>
    </>
  );
}
