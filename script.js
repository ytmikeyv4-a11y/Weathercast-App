// ── Detect Brave ──
(async()=>{
  const isBrave=navigator.brave&&await navigator.brave.isBrave().catch(()=>false);
  if(isBrave) document.getElementById('bravewarn').style.display='block';
})();

// ── WMO codes ──
const WM={0:{l:"Clear Sky",i:"☀️"},1:{l:"Mainly Clear",i:"🌤"},2:{l:"Partly Cloudy",i:"⛅"},3:{l:"Overcast",i:"☁️"},45:{l:"Foggy",i:"🌫"},48:{l:"Icy Fog",i:"🌫"},51:{l:"Light Drizzle",i:"🌦"},53:{l:"Moderate Drizzle",i:"🌦"},55:{l:"Dense Drizzle",i:"🌧"},61:{l:"Slight Rain",i:"🌧"},63:{l:"Moderate Rain",i:"🌧"},65:{l:"Heavy Rain",i:"🌧"},71:{l:"Slight Snow",i:"🌨"},73:{l:"Moderate Snow",i:"❄️"},75:{l:"Heavy Snow",i:"❄️"},77:{l:"Snow Grains",i:"🌨"},80:{l:"Slight Showers",i:"🌦"},81:{l:"Moderate Showers",i:"🌧"},82:{l:"Violent Showers",i:"⛈"},85:{l:"Snow Showers",i:"🌨"},86:{l:"Heavy Snow Showers",i:"❄️"},95:{l:"Thunderstorm",i:"⛈"},96:{l:"Thunderstorm+Hail",i:"⛈"},99:{l:"Heavy Thunderstorm",i:"⛈"}};
const W=c=>WM[c]||{l:"Unknown",i:"🌡"};
const CN={IN:"India",GB:"United Kingdom",US:"United States",JP:"Japan",FR:"France",AE:"United Arab Emirates",AU:"Australia",RU:"Russia",EG:"Egypt",CN:"China",SG:"Singapore",CA:"Canada",DE:"Germany",TH:"Thailand",BR:"Brazil",MX:"Mexico",ZA:"South Africa",NG:"Nigeria",KE:"Kenya",PK:"Pakistan",BD:"Bangladesh",ID:"Indonesia",PH:"Philippines",VN:"Vietnam",KR:"South Korea",IT:"Italy",ES:"Spain",PT:"Portugal",NL:"Netherlands",BE:"Belgium",CH:"Switzerland",AT:"Austria",SE:"Sweden",NO:"Norway",DK:"Denmark",FI:"Finland",PL:"Poland",TR:"Turkey",SA:"Saudi Arabia",IR:"Iran",IQ:"Iraq",IL:"Israel",AR:"Argentina",CL:"Chile",CO:"Colombia",PE:"Peru",NZ:"New Zealand",MY:"Malaysia",NP:"Nepal",LK:"Sri Lanka",GH:"Ghana",MA:"Morocco",UA:"Ukraine",GR:"Greece",CZ:"Czech Republic"};
const cname=c=>CN[c]||c||"";

// ── Canvas ──
const cv=document.getElementById('bg'),cx=cv.getContext('2d');
let stars=[],bgc=['#090918','#131330'];
const initC=()=>{cv.width=window.innerWidth;cv.height=window.innerHeight;stars=Array.from({length:110},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height*.6,r:Math.random()*1.4,a:Math.random(),s:.003+Math.random()*.007}))};
const setBg=c=>{if([95,96,99].includes(c))bgc=['#0d0d18','#0d150b'];else if([61,63,65,80,81,82].includes(c))bgc=['#0a1020','#0d2032'];else if([71,73,75,77,85,86].includes(c))bgc=['#0f0f1c','#1c1e2c'];else if([0,1].includes(c))bgc=['#060610','#0a1028'];else bgc=['#090918','#131330']};
const drawC=()=>{const g=cx.createLinearGradient(0,0,0,cv.height);g.addColorStop(0,bgc[0]);g.addColorStop(1,bgc[1]);cx.fillStyle=g;cx.fillRect(0,0,cv.width,cv.height);stars.forEach(s=>{s.a+=s.s;cx.beginPath();cx.arc(s.x,s.y,s.r,0,Math.PI*2);cx.fillStyle=`rgba(255,255,255,${.25+Math.sin(s.a)*.35})`;cx.fill()});requestAnimationFrame(drawC)};
window.addEventListener('resize',initC);initC();drawC();

// ── Waveform ──
(()=>{const w=document.getElementById('wf');for(let i=0;i<54;i++){const b=document.createElement('div');b.className='wb';b.style.cssText=`height:${10+Math.random()*100}%;--d:${.3+Math.random()*.75}s;animation-delay:${Math.random()*-1}s`;w.appendChild(b)}})();

// ── State ──
let D=null,script='',playing=false,muted=false,elapsed=0,dur=180,paused=false;
const sy=window.speechSynthesis;
let utt=null,tmr=null;
const setL=(show,txt)=>{document.getElementById('ltxt').textContent=txt||'...';document.getElementById('ldr').classList.toggle('off',!show)};
const showErr=m=>{const e=document.getElementById('err');e.innerHTML=m;e.style.display='block'};
const hideErr=()=>document.getElementById('err').style.display='none';

// ── FETCH ──
async function apiGet(url){
  const r=await fetch(url,{method:'GET',mode:'cors',headers:{'Accept':'application/json'},referrerPolicy:'no-referrer'});
  if(!r.ok)throw new Error('Server error: '+r.status);
  return r.json();
}

async function go(){
  const v=document.getElementById('inp').value.trim();
  if(!v)return;
  hideErr();
  setL(true,'LOCATING CITY...');
  try{
    // Geocode
    if(v.length<3){setL(false);showErr('⚠️ Please enter at least 3 characters.');return;}
    const gd=await apiGet('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(v)+'&count=10&language=en&format=json');
    if(!gd.results||!gd.results.length){setL(false);showErr('⚠️ City "'+v+'" not found. Try a different spelling.');return;}
    const norm=s=>(s||'').toLowerCase().replace(/[^a-z]/g,'');
    const inp=norm(v);
    // Only accept results where feature_code is an official city/town AND population > 500
    const g=gd.results.find(r=>{
      if(norm(r.name)!==inp)return false;
      const pop=r.population;
      const fc=(r.feature_code||'').toUpperCase();
      const isAdminCity=['PPLC','PPLA','PPLA2','PPLA3','PPLA4'].some(x=>fc===x);
      const storedPop=r.population;
      const cc=(r.country_code||'').toUpperCase();
      // Admin cities (state/district capitals): always accept
      if(isAdminCity)return true;
      // PPL: Indian city with no stored population = real city (accept)
      if(fc==='PPL'&&cc==='IN'&&storedPop==null)return true;
      // PPL: any country, must have population >= 50000
      if(fc==='PPL'&&storedPop!=null)return storedPop>=50000;
      return false;
    });
    if(!g){setL(false);showErr('⚠️ City "'+v+'" not found. Please enter a valid city name.');return;}
    setL(true,'FETCHING LIVE WEATHER...');
    // Weather
    const wd=await apiGet('https://api.open-meteo.com/v1/forecast?latitude='+g.latitude+'&longitude='+g.longitude+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,surface_pressure,visibility&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&past_days=3&forecast_days=4&timezone=auto');
    setL(true,'CHECKING AIR QUALITY...');
    // AQI
    let aqi=null;
    try{const ad=await apiGet('https://air-quality-api.open-meteo.com/v1/air-quality?latitude='+g.latitude+'&longitude='+g.longitude+'&current=european_aqi&timezone=auto');aqi=ad?.current?.european_aqi??null;}catch(e){}
    D={name:g.name,country:cname(g.country_code),tz:g.timezone,c:wd.current,hourly:wd.hourly,daily:wd.daily,aqi};
    render(D);setL(false);
  }catch(e){
    setL(false);
    const msg=e.message||'';
    if(msg.includes('fetch')||msg.includes('network')||msg.includes('Failed')||msg.includes('Load')){
      showErr(`⚠️ <b>Network blocked!</b><br><br>
      API call failed. If you are using <b>Brave Browser</b>, click the <b>Shields icon</b> (top-right lion icon) → set <b>Shields Down</b> for this site, then refresh.<br><br>
      👉 <b>Fix:</b> Open this file in <b>Google Chrome</b> instead of Brave.<br>
      Right-click the HTML file → Open with → Google Chrome`);
    }else{
      showErr('⚠️ '+msg);
    }
  }
}
document.getElementById('inp').addEventListener('keydown',e=>{if(e.key==='Enter')go()});

// ── Render ──
function render(d){
  const{name,country,c,hourly,daily,aqi}=d;
  const w=W(c.weather_code),t=Math.round(c.temperature_2m),fl=Math.round(c.apparent_temperature),ti=3;
  document.getElementById('cn').textContent=name;
  document.getElementById('cc').textContent=country+' · '+(d.tz||'');
  document.getElementById('tm').textContent=t+'°C';
  document.getElementById('tf').textContent='Feels like '+fl+'°C · H:'+Math.round(daily.temperature_2m_max[ti])+'° L:'+Math.round(daily.temperature_2m_min[ti])+'°';
  document.getElementById('wi').textContent=w.i;
  document.getElementById('ct').textContent=w.l.toUpperCase();
  document.getElementById('cd').textContent='Wind '+Math.round(c.wind_speed_10m)+' km/h · Humidity '+c.relative_humidity_2m+'% · Pressure '+Math.round(c.surface_pressure)+' hPa';
  const vis=c.visibility?(c.visibility/1000).toFixed(1)+' km':'—';
  const sr=f12(daily.sunrise[ti]),ss=f12(daily.sunset[ti]);
  document.getElementById('sg').innerHTML=[{e:'💧',l:'HUMIDITY',v:c.relative_humidity_2m+'%'},{e:'💨',l:'WIND',v:Math.round(c.wind_speed_10m)+' km/h'},{e:'👁️',l:'VISIBILITY',v:vis},{e:'🌡',l:'FEELS LIKE',v:fl+'°C'},{e:'📊',l:'PRESSURE',v:Math.round(c.surface_pressure)+' hPa'},{e:'☁️',l:'CLOUD COVER',v:c.cloud_cover+'%'},{e:'🌅',l:'SUNRISE',v:sr},{e:'🌇',l:'SUNSET',v:ss}].map(s=>'<div class="sitem"><div class="si">'+s.e+'</div><div class="sl">'+s.l+'</div><div class="sv">'+s.v+'</div></div>').join('');
  document.getElementById('sunw').style.display='block';
  document.getElementById('srl').textContent='🌅 '+sr;
  document.getElementById('ssl').textContent='🌇 '+ss;
  placeSun(daily.sunrise[ti],daily.sunset[ti]);
  if(aqi!==null){document.getElementById('aqiw').style.display='block';const al=aqi<20?'Good':aqi<40?'Fair':aqi<60?'Moderate':aqi<80?'Poor':'Very Poor';document.getElementById('aqiv').textContent=aqi+' — '+al;document.getElementById('aqic').style.left=Math.min(95,Math.round(aqi/100*100))+'%';}
  const nowH=new Date().getHours(),times=hourly.time;
  let si=times.findIndex(t2=>{const dt=new Date(t2);return dt.toDateString()===new Date().toDateString()&&dt.getHours()===nowH});
  if(si<0)si=0;
  document.getElementById('hs').innerHTML=Array.from({length:24},(_,i)=>si+i).filter(i=>i<times.length).map((idx,i)=>{const dt=new Date(times[idx]);const hw=W(hourly.weather_code[idx]);return'<div class="hp '+(i===0?'now':'')+'"><div class="hpt">'+(i===0?'NOW':String(dt.getHours()).padStart(2,'0')+':00')+'</div><div class="hpi">'+hw.i+'</div><div class="hpv">'+Math.round(hourly.temperature_2m[idx])+'°</div></div>'}).join('');
  setTimeout(()=>{const el=document.querySelector('.hp.now');if(el)el.scrollIntoView({inline:'center',behavior:'smooth'})},100);
  document.getElementById('tg').innerHTML=daily.time.map((ds,i)=>{const dt=new Date(ds);const lbl=i===ti?'TODAY':dt.toLocaleDateString('en',{weekday:'short'}).toUpperCase();const dw=W(daily.weather_code[i]);const hi=Math.round(daily.temperature_2m_max[i]),lo=Math.round(daily.temperature_2m_min[i]),avg=Math.round((hi+lo)/2);const b=i===ti?'<span class="tbg bt">TODAY</span>':i<ti?'<span class="tbg bp">PAST</span>':'<span class="tbg ba">AHEAD</span>';return'<div class="tc"><div class="tch"><div class="tcd">'+lbl+'</div>'+b+'</div><span class="tci">'+dw.i+'</span><div class="tct">'+avg+'°C</div><div class="tcc">'+dw.l+'</div><div class="tchl">▲ '+hi+'°  ▼ '+lo+'°</div></div>'}).join('');
  document.getElementById('nrt').innerHTML=buildNarr(d,ti);
  if(sy)sy.cancel();playing=false;paused=false;elapsed=0;
  document.getElementById('pb').innerHTML='▶';document.getElementById('pt').classList.remove('spin');
  document.querySelectorAll('.wb').forEach(b=>b.classList.remove('on'));
  document.getElementById('pf').style.width='0%';document.getElementById('tc').textContent='0:00';
  script=buildScript(d,ti,sr,ss);
  document.getElementById('etitle').textContent='🎙 '+name+' — Live Briefing';
  document.getElementById('esub').textContent=new Date().toLocaleDateString('en',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  document.getElementById('sb').innerHTML=fmtS(script);
  document.getElementById('pt').textContent=w.i;
  dur=Math.round(clean(pronounce(script)).split(' ').length/2.5);
  document.getElementById('tt').textContent=fmtT(dur);
  fx(c.weather_code);setBg(c.weather_code);
}

function buildScript(d,ti,sr,ss){const{name,country,c,daily,aqi}=d;const w=W(c.weather_code),t=Math.round(c.temperature_2m),fl=Math.round(c.apparent_temperature);const desc=t>38?"dangerously hot":t>32?"a scorcher":t>25?"warm and pleasant":t>18?"mild and comfortable":t>10?"cool":t>0?"cold":"freezing";const aqiTxt=aqi===null?"unavailable":aqi<20?"good":aqi<40?"fair":aqi<60?"moderate":aqi<80?"poor":"very poor";const past=daily.time.slice(0,3).map((_,i)=>({date:new Date(daily.time[i]),w:W(daily.weather_code[i]),hi:Math.round(daily.temperature_2m_max[i]),lo:Math.round(daily.temperature_2m_min[i])}));const future=daily.time.slice(4).map((_,i)=>({date:new Date(daily.time[i+4]),w:W(daily.weather_code[i+4]),hi:Math.round(daily.temperature_2m_max[i+4]),lo:Math.round(daily.temperature_2m_min[i+4])}));const trend=past[0]?.hi>Math.round(daily.temperature_2m_max[ti])?"a cooling trend":"a warming trend";return`🎙 Welcome to WeatherCast — your live atmospheric briefing.\n\nToday we are broadcasting live from ${name}, ${country}.\n\n📍 CURRENT CONDITIONS\nRight now in ${name}, the temperature stands at ${t} degrees Celsius — ${desc}. It feels like ${fl} degrees Celsius outside. Conditions show ${w.l.toLowerCase()}, with ${c.cloud_cover} percent cloud cover. Wind is blowing at ${Math.round(c.wind_speed_10m)} kilometres per hour, humidity is at ${c.relative_humidity_2m} percent, and atmospheric pressure reads ${Math.round(c.surface_pressure)} hectopascals. Air quality today is rated ${aqiTxt}.\n\n${advice(c.weather_code,t,c.relative_humidity_2m)}\n\nThe sun rose at ${sr} and sets at ${ss}. Today's high reaches ${Math.round(daily.temperature_2m_max[ti])} degrees Celsius with a low of ${Math.round(daily.temperature_2m_min[ti])} degrees Celsius.\n\n📅 LOOKING BACK — RECENT DAYS\n${past.map(p=>`On ${p.date.toLocaleDateString('en',{weekday:'long'})}, ${name} saw ${p.w.l.toLowerCase()} with a high of ${p.hi} degrees Celsius and a low of ${p.lo} degrees Celsius.`).join(' ')}\n\nTemperatures are on ${trend} compared to earlier this week.\n\n🔮 WHAT IS AHEAD — 3-DAY OUTLOOK\n${future.map(f=>`${f.date.toLocaleDateString('en',{weekday:'long'})}: expect ${f.w.l.toLowerCase()} — highs of ${f.hi} degrees Celsius and lows of ${f.lo} degrees Celsius.`).join(' ')}\n\n${fAdv(future)}\n\nThat wraps up today's live edition of WeatherCast from ${name}, ${country}. Stay weather-aware! 🎙`;}
function advice(code,t,h){if([95,96,99].includes(code))return"⛈ Thunderstorm alert! Stay indoors.";if([65,82].includes(code))return"🌧 Heavy rainfall expected. Drive carefully.";if([51,53,55,61,63,80,81].includes(code))return"☔ Rain in the forecast. Carry an umbrella.";if([71,73,75,77,85,86].includes(code))return"❄️ Snow expected. Watch for ice on roads.";if(t>38)return"🥵 Extreme heat! Stay hydrated.";if(t<0)return"🧊 Freezing! Watch for black ice.";if(h>80)return"💦 High humidity. It will feel warmer than shown.";return"🌈 Pleasant conditions — great day to be outdoors!";}
function fAdv(f){if(f.some(x=>[95,96,99].includes(x.w?.code)))return"⛈ Stormy weather on the way.";if(f.some(x=>[71,73,75,77,85,86].includes(x.w?.code)))return"🧣 Snow forecast later this week.";if(f.some(x=>[51,53,55,61,63,65,80,81,82].includes(x.w?.code)))return"🌂 Wet weather expected this week.";if(f.some(x=>x.hi>36))return"🌡 Heat surge approaching — stay hydrated.";if(f.some(x=>x.lo<2))return"🧥 Near-freezing ahead — layer up.";return"✅ Comfortable conditions expected all week!";}
function buildNarr(d,ti){const{name,country,c,daily,aqi}=d;const w=W(c.weather_code),t=Math.round(c.temperature_2m),hi=Math.round(daily.temperature_2m_max[ti]),lo=Math.round(daily.temperature_2m_min[ti]),ph=Math.round(daily.temperature_2m_max[0]);const trend=ph>hi?"cooling trend":"warming trend";const aqiTxt=aqi===null?"unavailable":aqi<20?"excellent":aqi<40?"fair":aqi<60?"moderate":"poor";const nw=daily.weather_code[4]!==undefined?W(daily.weather_code[4]).l.toLowerCase():"—";const nh=daily.temperature_2m_max[4]!==undefined?Math.round(daily.temperature_2m_max[4]):"—";return`<em>${name}</em>, <em>${country}</em> is currently experiencing <em>${w.l.toLowerCase()}</em> at <em>${t}°C</em> — a ${trend} from earlier this week. Today spans from <em>${lo}°C</em> to <em>${hi}°C</em>. Humidity <em>${c.relative_humidity_2m}%</em>, wind <em>${Math.round(c.wind_speed_10m)} km/h</em>, cloud cover <em>${c.cloud_cover}%</em>. Air quality: <em>${aqiTxt}</em>. Tomorrow: <em>${nw}</em> with highs near <em>${nh}°C</em>.`;}
function fmtS(s){return s.replace(/(🎙[^\n]*)/g,'<strong class="hl">$1</strong>').replace(/(📍[^\n]*|📅[^\n]*|🔮[^\n]*)/g,'<span class="hl">$1</span>').replace(/\n/g,'<br>');}
function placeSun(rI,sI){const now=Date.now(),rise=new Date(rI).getTime(),set=new Date(sI).getTime();const t=Math.max(0,Math.min(1,(now-rise)/(set-rise)));const x=(1-t)*(1-t)*30+2*(1-t)*t*300+t*t*570;const y=(1-t)*(1-t)*96+2*(1-t)*t*(-10)+t*t*96;document.getElementById('sdot').setAttribute('cx',x);document.getElementById('sdot').setAttribute('cy',y);}
function f12(iso){if(!iso)return'—';const d=new Date(iso),h=d.getHours(),m=d.getMinutes();return(h%12||12)+':'+String(m).padStart(2,'0')+' '+(h>=12?'PM':'AM');}
function fx(code){document.getElementById('rc').innerHTML='';document.getElementById('sc').innerHTML='';document.getElementById('stc').innerHTML='';if([95,96,99].includes(code)){rain(95);lightning();}else if([65,82].includes(code))rain(80);else if([51,53,55,61,63,80,81].includes(code))rain(45);else if([71,73,75,77,85,86].includes(code))snow(40);}
function rain(n){const c=document.getElementById('rc');for(let i=0;i<n;i++){const e=document.createElement('div');e.className='rd';e.style.cssText='left:'+Math.random()*100+'%;height:'+(14+Math.random()*12)+'px;--dur:'+(0.4+Math.random()*0.6)+'s;--del:'+(-Math.random()*2)+'s;opacity:'+(0.3+Math.random()*0.5);c.appendChild(e);}}
function snow(n){const c=document.getElementById('sc');const f=['❄','✦','✧','*','·'];for(let i=0;i<n;i++){const e=document.createElement('div');e.className='sf';e.textContent=f[Math.floor(Math.random()*f.length)];e.style.cssText='left:'+Math.random()*100+'%;--dur:'+(3+Math.random()*5)+'s;--del:'+(-Math.random()*8)+'s;--sz:'+(0.8+Math.random()*1.1)+'rem;--dr:'+((Math.random()-0.5)*90)+'px';c.appendChild(e);}}
function lightning(){const e=document.createElement('div');e.className='lf';document.getElementById('stc').appendChild(e);}
function pronounce(t){const map={'Morbi':'Mor-bee','morbi':'mor-bee','MORBI':'Mor-bee','Bhachau':'Buh-chow','bhachau':'buh-chow','BHACHAU':'Buh-chow','Kutch':'Kuch','kutch':'kuch','KUTCH':'Kuch','Anjar':'Un-jar','anjar':'un-jar','Rajkot':'Raj-coat','rajkot':'raj-coat','RAJKOT':'Raj-coat','Ahmedabad':'Ah-med-uh-bad','ahmedabad':'ah-med-uh-bad','AHMEDABAD':'Ah-med-uh-bad','Gandhinagar':'Gahn-dee-nuh-gar','Surat':'Soo-rat','surat':'soo-rat','SURAT':'Soo-rat','Vadodara':'Vuh-doe-duh-ra','vadodara':'vuh-doe-duh-ra','Jamnagar':'Jum-nuh-gar','jamnagar':'jum-nuh-gar','Bhavnagar':'Bhav-nuh-gar','bhavnagar':'bhav-nuh-gar','Junagadh':'Joo-nuh-gad','junagadh':'joo-nuh-gad','Amreli':'Um-ray-lee','amreli':'um-ray-lee','Porbandar':'Por-bun-dar','porbandar':'por-bun-dar','Dwarka':'Dwaar-ka','dwarka':'dwaar-ka','Somnath':'Som-naath','somnath':'som-naath','Mehsana':'Meh-saa-na','mehsana':'meh-saa-na','Patan':'Puh-tun','Navsari':'Nav-saa-ree','navsari':'nav-saa-ree','Vapi':'Vaa-pee','vapi':'vaa-pee','Anand':'Aa-nand','anand':'aa-nand','Nadiad':'Naa-dee-ad','nadiad':'naa-dee-ad','Surendranagar':'Soo-ren-dra-nuh-gar','Gandhidham':'Gaan-dhee-dhaam','gandhidham':'gaan-dhee-dhaam','Mumbai':'Mum-bye','mumbai':'mum-bye','MUMBAI':'Mum-bye','Delhi':'Del-ee','delhi':'del-ee','Pune':'Poo-nay','pune':'poo-nay','PUNE':'Poo-nay','Kolkata':'Coal-kah-ta','kolkata':'coal-kah-ta','Hyderabad':'Hy-dra-bad','hyderabad':'hy-dra-bad','Bengaluru':'Ben-gah-loo-roo','bengaluru':'ben-gah-loo-roo','Bangalore':'Bang-guh-lor','bangalore':'bang-guh-lor','Chennai':'Chen-eye','chennai':'chen-eye','Jaipur':'Jy-poor','jaipur':'jy-poor','Lucknow':'Luck-now','lucknow':'luck-now','Bhopal':'Boh-paal','bhopal':'boh-paal','Indore':'In-dor','indore':'in-dor','Nagpur':'Nag-poor','nagpur':'nag-poor','Patna':'Put-na','patna':'put-na','Ranchi':'Run-chee','ranchi':'run-chee','Bhubaneswar':'Boo-bun-esh-wur','Chandigarh':'Chun-dee-gar','chandigarh':'chun-dee-gar','Dehradun':'Deh-ra-doon','dehradun':'deh-ra-doon','Guwahati':'Goo-wuh-haa-tee','guwahati':'goo-wuh-haa-tee','Thiruvananthapuram':'Tih-roo-vuh-nun-thuh-poo-rum','Visakhapatnam':'Viss-akh-a-put-num','Coimbatore':'Coyim-buh-tor','coimbatore':'coyim-buh-tor','Madurai':'Muh-doo-rye','madurai':'muh-doo-rye','Varanasi':'Vuh-raa-nuh-see','varanasi':'vuh-raa-nuh-see','Agra':'Aa-gra','agra':'aa-gra','Amritsar':'Um-rit-sar','amritsar':'um-rit-sar','Ludhiana':'Lud-hee-aa-na','ludhiana':'lud-hee-aa-na','Jodhpur':'Jod-poor','jodhpur':'jod-poor','Udaipur':'Oo-die-poor','udaipur':'oo-die-poor','Kochi':'Ko-chee','kochi':'ko-chee','Goa':'Go-ah','goa':'go-ah'};let r=t;Object.keys(map).forEach(k=>{r=r.replace(new RegExp('\b'+k+'\b','g'),map[k]);});return r;}
function clean(t){return t.replace(/[🎙📍📅🔮🌏☔🧥🥵💨💦🌈✅🧣🌂🌡☀️⛈🌧🌦❄️🌨🌅🌇📊💧👁️☁️🌤⛅🌫]/gu,'').replace(/[▲▼·•◆◇★☆]/g,'').replace(/(-?\d+(\.\d+)?)\s*°[Cc]/g,'$1 degrees Celsius').replace(/°/g,' degrees').replace(/\n{3,}/g,'\n\n').replace(/[^\x00-\x7F]/g,' ').replace(/\s{2,}/g,' ').trim();}
function setPl(p){playing=p;document.getElementById('pb').innerHTML=p?'⏸':'▶';document.getElementById('pt').classList.toggle('spin',p);document.querySelectorAll('.wb').forEach(b=>b.classList.toggle('on',p));}
function startT(){clearInterval(tmr);tmr=setInterval(()=>{if(!playing||paused)return;elapsed=Math.min(elapsed+1,dur);document.getElementById('pf').style.width=(elapsed/dur*100)+'%';document.getElementById('tc').textContent=fmtT(elapsed);if(elapsed>=dur){clearInterval(tmr);setPl(false);}},1000);}
function tog(){if(!D){alert('Please search for a city first!');return;}if(!script)return;if(paused&&sy.paused){sy.resume();paused=false;setPl(true);startT();return;}if(playing&&sy.speaking){sy.pause();paused=true;setPl(false);clearInterval(tmr);return;}sy.cancel();paused=false;elapsed=0;utt=new SpeechSynthesisUtterance(clean(pronounce(script)));utt.rate=0.92;utt.pitch=1;utt.volume=muted?0:1;const vs=sy.getVoices();const best=vs.find(v=>(v.name.includes('Google')||v.name.includes('Daniel')||v.name.includes('Samantha'))&&v.lang.startsWith('en'))||vs.find(v=>v.lang.startsWith('en'));if(best)utt.voice=best;utt.onstart=()=>{setPl(true);startT();};utt.onend=()=>{setPl(false);paused=false;elapsed=dur;document.getElementById('pf').style.width='100%';document.getElementById('tc').textContent=fmtT(dur);clearInterval(tmr);};utt.onerror=e=>{console.warn('TTS:',e.error);setPl(false);clearInterval(tmr);};sy.speak(utt);}
function skB(){sy.cancel();paused=false;setPl(false);clearInterval(tmr);elapsed=0;document.getElementById('pf').style.width='0%';document.getElementById('tc').textContent='0:00';setTimeout(()=>tog(),200);}
function skF(){sy.cancel();paused=false;setPl(false);clearInterval(tmr);elapsed=Math.min(dur,elapsed+20);document.getElementById('pf').style.width=(elapsed/dur*100)+'%';document.getElementById('tc').textContent=fmtT(elapsed);}
function seek(e){const r=e.currentTarget.getBoundingClientRect(),p=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));elapsed=Math.round(p*dur);document.getElementById('pf').style.width=(p*100)+'%';document.getElementById('tc').textContent=fmtT(elapsed);if(playing||sy.speaking){sy.cancel();setTimeout(()=>tog(),150);}}
function muteT(){muted=!muted;document.getElementById('vb').textContent=muted?'🔇':'🔊';if(sy.speaking&&!sy.paused){sy.cancel();setTimeout(()=>tog(),150);}}
window.speechSynthesis.onvoiceschanged=()=>{};
function fmtT(s){return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
setTimeout(()=>setL(false),600);
// Fix autofill white background via JS
const inp2=document.getElementById("inp");
if(inp2){inp2.addEventListener("animationstart",e=>{if(e.animationName.includes("autofill")){inp2.style.background="rgba(255,255,255,.05)";inp2.style.color="#e8e8f0";}});inp2.addEventListener("input",()=>{inp2.style.background="rgba(255,255,255,.05)";inp2.style.color="#e8e8f0";});document.addEventListener("DOMContentLoaded",()=>{setTimeout(()=>{inp2.style.background="rgba(255,255,255,.05)";inp2.style.color="#e8e8f0";},300);});}
