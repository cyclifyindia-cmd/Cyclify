'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tools=require('../assets/js/admin-tools');
const now=new Date(2026,9,17,12),at=(y,m,d,h=12)=>new Date(y,m-1,d,h);
const orders=[
 {id:'a',number:'CY1001',createdAt:at(2026,10,17),status:'Order Received',paymentStatus:'Paid',total:29999,address:{firstName:'Sample',lastName:'Rider',phone:'9000000000',city:'Chennai'},items:[{name:'ThinkRider X2 Max',id:'36',size:'Standard'}]},
 {id:'b',number:'CY1002',createdAt:at(2026,10,11),status:'Order Shipped',paymentStatus:'Paid',total:5155,tracking:{courier:'Demo Courier',number:'AWB-12'},items:[{name:'2XU Core Tights',size:'M'}]},
 {id:'c',number:'CY1003',createdAt:at(2026,9,30),status:'Order Delivered',paymentStatus:'Paid',total:155000},
 {id:'d',number:'CY1004',createdAt:at(2026,10,1),status:'Order Received',paymentStatus:'Refund Pending',total:7000},
 {id:'e',number:'CY1005',createdAt:at(2026,8,1),status:'Order Received',paymentStatus:'Refunded',total:3000},
 {id:'f',number:'CY1006',createdAt:at(2025,12,31),status:'Order Delivered',total:1000},
 {id:'g',number:'CY1007',createdAt:null,status:'Order Received',total:900},
 {id:'h',number:'CY1008',createdAt:at(2026,10,18),status:'Order Received',total:1000}
];
const ids=f=>tools.filterOrders(orders,f,now).map(o=>o.id).sort();
assert.deepEqual(ids({query:'thinkrider sample'}),['a']);assert.deepEqual(ids({query:'9000000000'}),['a']);assert.deepEqual(ids({query:'awb-12'}),['b']);assert.deepEqual(ids({query:'2xu M'}),['b']);assert.deepEqual(ids({query:'"<script>"'}),[]);
assert.deepEqual(ids({status:'Order Received'}),['a','g','h']);assert.deepEqual(ids({status:'refunds'}),['d','e']);assert.deepEqual(ids({payment:'Refund Pending'}),['d']);assert.equal(tools.status(orders[4]),'Order Cancelled & Refunded');
assert.deepEqual(ids({period:'today'}),['a']);assert.deepEqual(ids({period:'7-days'}),['a','b']);assert.deepEqual(ids({period:'month'}),['a','b','d']);assert.deepEqual(ids({period:'three-months'}),['a','b','c','d','e']);assert.deepEqual(ids({period:'year'}),['a','b','c','d','e']);assert.deepEqual(ids({period:'date',date:'2026-09-30'}),['c']);assert.deepEqual(ids({period:'range',from:'2026-10-01',to:'2026-10-11'}),['b','d']);assert.deepEqual(ids({period:'range',from:'2026-10-11',to:'2026-10-01'}),[]);
assert.deepEqual(ids({period:'30-days'}),['a','b','c','d']);assert.equal(tools.filterOrders(orders,{sort:'value-high'},now)[0].id,'c');assert.equal(tools.filterOrders(orders,{sort:'oldest'},now)[0].id,'g');
assert.equal(tools.date({seconds:1}).getTime(),1000);assert.equal(tools.date({toDate:()=>at(2026,10,1)}).getMonth(),9);assert.equal(tools.date('invalid'),null);
const many=Array.from({length:61},(_,i)=>({id:i}));assert.equal(tools.paginate(many,3,25).items.length,11);assert.equal(tools.paginate(many,99,25).page,3);assert.equal(tools.paginate([],9,25).first,0);assert.equal(tools.paginate(many,-4,25).page,1);assert.equal(many.length,61);
const source=fs.readFileSync('admin.html','utf8');new vm.Script(source.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import.*$/gm,''));
assert(source.includes('const ADMIN_EMAIL="admin@cyclify.in"'));assert(source.includes('reauthenticateWithCredential(auth.currentUser,credential)'));assert(source.includes('refundDialog.showModal()'));assert(source.includes('user.email?.toLowerCase()!==ADMIN_EMAIL'));
assert(!/updatePassword|sendPasswordResetEmail|setPersistence|localStorage\.setItem|sessionStorage\.setItem/.test(source));
assert(source.includes('captureOrderDrafts()')&&source.includes('restoreOrderDrafts()'));assert(source.includes('orderDrafts.delete(orderElement.dataset.path)'));assert(source.includes('Gross order value'));
for(const id of ['paymentFilter','orderSort','orderPagination','customDateRange','resetOrderFilters','orderResults'])assert(source.includes('id="'+id+'"'));
console.log('Admin workspace: filters, date boundaries, payments, sort, pagination, syntax, in-memory drafts and unchanged authentication/refund safeguards passed.');
