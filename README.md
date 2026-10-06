# q_signal

เซิร์ฟเวอร์ Node.js + Socket.IO สำหรับส่งสัญญาณระหว่างเครื่องเรียกคิวและจอแสดงผล โดยไม่เชื่อมต่อฐานข้อมูล ใช้พอร์ต HTTP **19009** ซึ่งกำหนดไว้ใน `server.js`

## เตรียมเครื่อง

ติดตั้ง Node.js รุ่น LTS พร้อม npm แล้วตรวจสอบว่าเรียกคำสั่งได้

```sh
node --version
npm --version
```

## ติดตั้งโปรเจกต์

ดาวน์โหลดจาก public repository

```sh
git clone https://github.com/tehnplk/q_signal.git
cd q_signal
npm ci --omit=dev
```

หากมีโฟลเดอร์โปรเจกต์อยู่แล้ว ให้เข้าโฟลเดอร์นั้นแล้วรันเฉพาะ `npm ci --omit=dev` เช่น บน Windows

```powershell
cd E:\q_stack\q_signal
npm ci --omit=dev
```

## วิธีที่ 1 รันด้วย Node.js โดยตรง

รันจากโฟลเดอร์ `q_signal`

```sh
node server.js
```

หรือใช้คำสั่งที่กำหนดไว้ใน `package.json` แทน

```sh
npm start
```

เลือกใช้คำสั่งใดคำสั่งหนึ่ง เมื่อเริ่มสำเร็จจะแสดง `q_signal on :19009` ให้เปิด terminal นี้ค้างไว้ระหว่างใช้งาน กด `Ctrl+C` เพื่อหยุดเซิร์ฟเวอร์

เมื่อต้องการเริ่มใหม่ ให้รันคำสั่งเดิม วิธีนี้เหมาะสำหรับทดลองหรือดู log ใน terminal โดยตรง

## วิธีที่ 2 รันเบื้องหลังด้วย PM2

หากยังไม่มี PM2 ให้ติดตั้งครั้งเดียว

```sh
npm install -g pm2
pm2 --version
```

หยุดโปรแกรมที่รันด้วย Node.js โดยตรงก่อน แล้วรันจากโฟลเดอร์ `q_signal` ด้วยบัญชีผู้ใช้ที่จะดูแลโปรแกรม

```sh
pm2 start server.js --name q_signal --time
pm2 status
pm2 logs q_signal --lines 50
```

สถานะควรเป็น `online` และ log ควรแสดง `q_signal on :19009` PM2 จะดูแลให้โปรแกรมทำงานเบื้องหลังและเริ่มใหม่หาก process ล้ม กด `Ctrl+C` เพื่อออกจากหน้าดู log โดยโปรแกรมยังทำงานต่อ

คำสั่งนี้ใช้ fork mode หนึ่ง process ให้ใช้รูปแบบนี้ เพราะ Socket.IO rooms ของโปรเจกต์อยู่ใน process เดียวและยังไม่มี adapter สำหรับเชื่อมหลาย process จึงไม่ควรเพิ่ม `-i max` หรือเปิดหลาย instance

## เชื่อมต่อจากเครื่องอื่น

ทั้งสองวิธีใช้พอร์ต `19009` เหมือนกัน หากเครื่องอื่นในเครือข่ายต้องเชื่อมต่อ ให้เปิด TCP พอร์ต `19009` ใน firewall ของเครื่องเซิร์ฟเวอร์ และตั้งค่าเครื่องเรียกคิวหรือจอให้เชื่อมต่อ `http://<IP-เซิร์ฟเวอร์>:19009`

## คำสั่งดูแลโปรแกรมด้วย PM2

| งาน | คำสั่ง |
| --- | --- |
| ดูสถานะ | `pm2 status` |
| ดูรายละเอียด | `pm2 describe q_signal` |
| ดู log | `pm2 logs q_signal --lines 100` |
| เริ่มใหม่ | `pm2 restart q_signal` |
| หยุด | `pm2 stop q_signal` |
| เริ่มอีกครั้งหลังหยุด | `pm2 restart q_signal` |
| หยุดและลบออกจากรายการ PM2 | `pm2 delete q_signal` |

หากพบ `EADDRINUSE` แสดงว่ามีโปรแกรมใช้พอร์ต `19009` อยู่แล้ว ให้ตรวจสอบโปรแกรมที่ใช้พอร์ต และหยุดตัวที่ซ้ำก่อนเริ่ม `q_signal`

## เริ่มอัตโนมัติหลังรีบูต

### Linux

หลังจาก `q_signal` มีสถานะ `online` ให้รันด้วยบัญชีผู้ใช้เดียวกับที่เริ่มโปรแกรม

```sh
pm2 startup
```

PM2 จะแสดงคำสั่งสำหรับติดตั้ง startup service ซึ่งมักขึ้นต้นด้วย `sudo` ให้คัดลอกและรันคำสั่งที่ PM2 แสดง แล้วบันทึกรายการ process

```sh
pm2 save
```

หลังรีบูต ให้ตรวจสอบด้วย `pm2 status` และ `pm2 logs q_signal --lines 50`

`pm2 save` บันทึกรายการทุกโปรแกรมของบัญชี PM2 นี้ หากเพิ่มหรือลบโปรแกรม ให้บันทึกใหม่เมื่อต้องการให้รายการหลังรีบูตตรงกับปัจจุบัน

### Windows

คำสั่งเริ่มโปรแกรมและดูแล PM2 ด้านบนใช้ได้บน Windows แต่ `pm2 startup` ไม่มีระบบ startup สำหรับ Windows ในตัว

บันทึกรายการ process ที่ต้องการกู้คืน

```powershell
pm2 save
```

หลังเปิดเครื่อง สามารถกู้คืนรายการด้วยบัญชีผู้ใช้เดิม

```powershell
pm2 resurrect
```

หากต้องการกู้คืนอัตโนมัติ ให้ตั้ง Windows Task Scheduler ให้เรียก `pm2 resurrect` หลังเข้าสู่ระบบด้วยบัญชีเดิม ตรวจพาธเต็มของ `pm2.cmd` ด้วย `where.exe pm2`

ในช่อง Program/script ให้ใช้ `cmd.exe` และตั้ง arguments เป็น `/c ""<พาธเต็มของ pm2.cmd>" resurrect"` โดยแทนพาธด้วยค่าที่ตรวจได้ การเริ่มก่อนเข้าสู่ระบบต้องตั้ง task หรือ Windows service แยกต่างหาก

## อัปเดตจาก Git

หากรันด้วย Node.js โดยตรง ให้หยุดด้วย `Ctrl+C` ก่อนอัปเดต แล้วรันคำสั่งต่อไปนี้จากโฟลเดอร์โปรเจกต์

```sh
git pull --ff-only
npm ci --omit=dev
```

หลังอัปเดต หากใช้ Node.js โดยตรง ให้รัน `node server.js` หรือ `npm start` อีกครั้ง

หากรันด้วย PM2 ให้เริ่มโปรแกรมใหม่หลังอัปเดต

```sh
pm2 restart q_signal
pm2 status
```

## ทดสอบโปรแกรม

`npm test` จะเปิดเซิร์ฟเวอร์ทดสอบที่พอร์ต `19009` จึงต้องหยุด `q_signal` ก่อน หากใช้ Node.js โดยตรง ให้กด `Ctrl+C` หากใช้ PM2 ให้รัน `pm2 stop q_signal`

การทดสอบบนเครื่องที่ให้บริการอยู่จะทำให้บริการหยุดชั่วคราว ติดตั้ง dependencies รวมชุดทดสอบ แล้วรันทดสอบ

```sh
npm ci
npm test
```

ผลทดสอบที่ผ่านจะแสดง `OK` ให้เริ่มบริการกลับด้วย `node server.js`, `npm start` หรือ `pm2 restart q_signal` ตามวิธีที่ใช้งาน แม้การทดสอบไม่ผ่าน

## เอกสารอ้างอิง

- [วิธีรัน Node.js จาก command line](https://nodejs.org/api/cli.html)
- [คำสั่งติดตั้งและดูแล process](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [ตั้ง startup service และบันทึกรายการ process](https://pm2.keymetrics.io/docs/usage/startup/)
