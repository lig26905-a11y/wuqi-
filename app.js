'use strict';
const KEY='wuqi.records.v1', $=id=>document.getElementById(id);
let records=[], pendingDelete=null, timer, storageBlocked=false;
const MAIN_CATEGORIES=['美妆','护肤品','面膜','生活用品','零食'];
const CATEGORY_KEYWORDS={
 '美妆':['美妆','腮红','口红','粉底液','粉底霜','粉底膏','粉底','粉饼','气垫','散粉','蜜粉','定妆粉','定妆喷雾','遮瑕液','遮瑕膏','遮瑕','修容粉','修容棒','修容','高光','眼影','眼线笔','眼线液','眼线','眉笔','眉粉','染眉膏','睫毛膏','假睫毛','唇釉','唇彩','唇泥','唇线笔','唇膏','妆前乳','妆前','隔离霜','隔离乳','美妆蛋','化妆刷','指甲油','香水','定妆','唇蜜','唇笔','眉膏','眉胶','睫毛夹','粉扑','卸甲油'],
 '护肤品':['护肤品','水乳','爽肤水','柔肤水','化妆水','保湿水','精华液','精华乳','精华水','精华','面霜','乳液','保湿霜','日霜','晚霜','眼霜','眼部精华','眼部','洗面奶','洁面乳','洁面泡沫','洁面','卸妆水','卸妆油','卸妆膏','卸妆','防晒霜','防晒乳','防晒喷雾','防晒','护手霜','身体乳','润肤乳','润肤','护唇膏','润唇膏','护唇','美容液','安瓶','冻干粉','护肤','修护霜','修复霜','去角质膏','磨砂膏','爽肤乳','保湿乳','修护乳','护肤套装','素颜霜'],
 '面膜':['面膜','补水面膜','保湿面膜','美白面膜','修护面膜','修复面膜','舒缓面膜','清洁面膜','抗皱面膜','紧致面膜','控油面膜','祛痘面膜','精华面膜','胶原面膜','玻尿酸面膜','烟酰胺面膜','积雪草面膜','芦荟面膜','海藻面膜','睡眠面膜','涂抹面膜','贴片面膜','冻膜','泥膜','撕拉面膜','泡泡面膜','水光面膜','晚安面膜','眼膜','唇膜','颈膜','手膜','足膜','膜布','软膜粉','蚕丝面膜','竹炭面膜','珍珠面膜','蜂蜜面膜','牛奶面膜','燕窝面膜','绿茶面膜','黄瓜面膜','维生素面膜','补水膜','保湿膜','清洁泥膜','睡眠冻膜','面贴膜','面膜粉'],
 '生活用品':['生活用品','纸巾','卫生纸','抽纸','卷纸','湿巾','洗衣液','洗衣粉','洗衣凝珠','洗衣','柔顺剂','洗洁精','洗手液','肥皂','香皂','牙膏','牙刷','漱口水','洗发水','洗发露','洗发','护发素','护发','沐浴露','沐浴','清洁剂','洁厕剂','消毒液','消毒','垃圾袋','保鲜膜','保鲜袋','卫生巾','卫生棉','棉签','棉片','驱蚊液','驱蚊','蚊香','除湿剂','洗碗布','百洁布','洗脸巾','化妆棉','厨房纸','油污净','洗洁粉','洁厕块','洗衣皂','洗衣香珠'],
 '零食':['零食','面包','饼干','曲奇','威化','薯片','薯条','虾条','锅巴','巧克力','糖果','棒棒糖','软糖','硬糖','果冻','布丁','坚果','瓜子','花生','开心果','腰果','核桃','碧根果','夏威夷果','果干','葡萄干','芒果干','蜜饯','话梅','山楂片','肉干','牛肉干','肉脯','辣条','爆米花','雪饼','仙贝','蛋黄酥','沙琪玛','小蛋糕','海苔','鱿鱼丝','蛋卷','米饼','麻花','绿豆糕','桃酥','凤梨酥','豆干','鸭脖','鸡爪']
};
function matchCategory(name){
 const text=String(name||'').toLocaleLowerCase().replace(/\s+/g,'');
 // Specific product names outrank short words: 润唇膏 before 唇膏, 巧克力面膜 before 巧克力.
 if(CATEGORY_KEYWORDS['面膜'].some(word=>text.includes(word)))return '面膜';
 let category='',longest=0;
 for(const [group,words]of Object.entries(CATEGORY_KEYWORDS))for(const word of words)if(text.includes(word)&&word.length>longest){category=group;longest=word.length;}
 return category;
}
function setupCategory(container){
 const name=container.querySelector('[name="name"]'),old=container.querySelector('[name="category"]'),select=document.createElement('select');
 select.name='category';select.required=true;select.append(new Option('请选择大类',''),...MAIN_CATEGORIES.map(c=>new Option(c,c)));
 for(const c of [...new Set(records.map(r=>r.category))])if(!MAIN_CATEGORIES.includes(c))select.append(new Option(c,c));
 old.replaceWith(select);
 name.addEventListener('input',()=>{if(select.dataset.manual!=='true')select.value=matchCategory(name.value);});
 select.addEventListener('change',()=>{select.dataset.manual=select.value?'true':'false';});
}
function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01')return false;const d=new Date(value+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===value;}
function dayNumber(value){const [y,m,d]=value.split('-').map(Number);return Date.UTC(y,m-1,d)/86400000;}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function state(date){const days=dayNumber(date)-dayNumber(today());return {days,type:days<0?'expired':days<=30?'soon':'normal',text:days<0?`已过期 ${-days} 天`:days===0?'今天到期':days<=30?`剩余 ${days} 天`:'有效期充足'};}
function error(message){$('storageError').textContent=message;$('storageError').hidden=false;}
try{const raw=localStorage.getItem(KEY);if(raw!==null){const data=JSON.parse(raw);if(!Array.isArray(data)||!data.every(r=>r&&typeof r.id==='string'&&typeof r.name==='string'&&r.name.trim()&&typeof r.category==='string'&&r.category.trim()&&validDate(r.date)))throw Error('invalid');records=data;}}catch(e){storageBlocked=true;error('浏览器中的记录无法读取。为保护原数据，已暂停保存和删除。请换回原来使用的浏览器，或保留此网页并联系帮助。');}
function commit(next){if(storageBlocked){toast('当前无法保存，请查看页面上方的提示。');return false;}try{localStorage.setItem(KEY,JSON.stringify(next));records=next;$('storageError').hidden=true;render();return true;}catch(e){error('保存失败：浏览器可能禁止存储或空间不足。此次操作未保存，请保留填写内容并检查浏览器设置。');return false;}}
function toast(message){clearTimeout(timer);$('notice').textContent=message;$('notice').hidden=false;timer=setTimeout(()=>$('notice').hidden=true,3500);}
function cell(text){const td=document.createElement('td');td.textContent=text;return td;}
function render(){const categories=[...new Set([...MAIN_CATEGORIES,...records.map(r=>r.category)])].sort((a,b)=>a.localeCompare(b,'zh-CN'));const selected=$('categoryFilter').value;$('categoryFilter').replaceChildren(new Option('全部归类',''),...categories.map(c=>new Option(c,c)));$('categoryFilter').value=categories.includes(selected)?selected:'';$('categories').replaceChildren(...categories.map(c=>new Option(c,c)));
 $('total').textContent=records.length;$('expired').textContent=records.filter(r=>state(r.date).type==='expired').length;$('soon').textContent=records.filter(r=>state(r.date).type==='soon').length;
 document.getElementById("week").textContent=records.filter(r=>{const days=state(r.date).days;return days>=0&&days<=7;}).length;
 const query=$('search').value.trim().toLocaleLowerCase(),category=$('categoryFilter').value,status=$('statusFilter').value;
 const found=records.filter(r=>r.name.toLocaleLowerCase().includes(query)&&(!category||r.category===category)&&(!status||state(r.date).type===status)).sort((a,b)=>a.date.localeCompare(b.date));
 $('resultCount').textContent=`（${found.length} 条）`;$('records').replaceChildren();for(const r of found){const tr=document.createElement('tr'),s=state(r.date);tr.append(cell(r.name),cell(r.category),cell(r.date));const statusCell=cell(''),badge=document.createElement('span');badge.className='badge '+s.type;badge.textContent=s.text;statusCell.append(badge);const action=cell(''),button=document.createElement('button');button.type='button';button.className='danger';button.textContent='删除';button.setAttribute('aria-label',`删除 ${r.name}`);button.onclick=()=>{pendingDelete=r.id;$('deleteText').textContent=`将删除“${r.name}”，删除后无法恢复。`;$('deleteDialog').showModal();};action.append(button);tr.append(statusCell,action);$('records').append(tr);}
 $('table').hidden=!found.length;$('empty').hidden=!!found.length;$('empty').querySelector('strong').textContent=records.length?'没有找到匹配的物品':'还没有物品记录';$('empty').querySelector('span:last-child').textContent=records.length?'试试其他名称，或将归类、状态切换为“全部”。':'在上方添加第一件物品，开始轻松管理到期时间。';}
function record(form){return {id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,name:form.querySelector('[name="name"]').value.trim(),category:form.querySelector('[name="category"]').value.trim(),date:form.querySelector('[name="date"]').value};}
function validate(r){return r.name&&r.category&&validDate(r.date);}
$('singleForm').onsubmit=async e=>{e.preventDefault();const r=record(e.target);if(!validate(r)){toast('请填写名称、归类和有效的到期时间，不能只填空格。');return;}if(await commit([...records,r])){e.target.reset();delete e.target.querySelector('[name="category"]').dataset.manual;toast('已保存 1 条记录');}};
function addRow(){const row=document.createElement('div');row.className='batchrow';for(const [name,title,placeholder] of [['name','物品名称','例如：补水面膜'],['category','物品归类','例如：食品'],['date','到期时间','']]){const label=document.createElement('label');label.textContent=title;const input=document.createElement('input');input.name=name;input.type=name==='date'?'date':'text';input.required=true;input.placeholder=placeholder;if(name==='date'){input.min='1900-01-01';input.max='9999-12-31';}else input.maxLength=name==='name'?100:60;if(name==='category')input.setAttribute('list','categories');label.append(input);row.append(label);}const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='移除此行';remove.onclick=()=>{if($('batchRows').children.length===1){row.querySelectorAll('input,select').forEach(i=>i.value='');delete row.querySelector('[name=category]').dataset.manual;}else row.remove();};row.append(remove);setupCategory(row);$('batchRows').append(row);}
$('addRow').onclick=addRow;
$('batchForm').onsubmit=async e=>{e.preventDefault();const additions=[...$('batchRows').children].map(record);if(!additions.every(validate)){toast('请完整填写每行；不需要的行可以移除。');return;}if(await commit([...records,...additions])){$('batchRows').replaceChildren();addRow();toast(`已保存 ${additions.length} 条记录`);}};
function tab(batch){$('singleForm').hidden=batch;$('batchForm').hidden=!batch;for(const [id,on] of [['singleTab',!batch],['batchTab',batch]]){$(id).classList.toggle('active',on);$(id).setAttribute('aria-pressed',String(on));}}
$('singleTab').onclick=()=>tab(false);$('batchTab').onclick=()=>tab(true);
$('search').oninput=render;$('categoryFilter').onchange=render;$('statusFilter').onchange=render;
$('cancelDelete').onclick=()=>$('deleteDialog').close();$('confirmDelete').onclick=async ()=>{if(pendingDelete&&await commit(records.filter(r=>r.id!==pendingDelete))){$('deleteDialog').close();pendingDelete=null;toast('记录已删除');}};
window.addEventListener('storage',e=>{if(e.key===KEY)location.reload();});window.addEventListener('focus',render);setInterval(render,60000);setupCategory(document.getElementById("singleForm"));addRow();render();
