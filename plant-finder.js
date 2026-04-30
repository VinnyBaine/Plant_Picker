/* ============================================================
   Plot — A plant finder for the Home Counties
   plant-finder.js · v28
   © 2026 Nigel Camp. All rights reserved.
   
   Extracted from plant-finder-v27.html for GitHub/jsDelivr hosting.
   Plant database loaded from plot-plants.json on init.
   ============================================================ */

(function(){

// Plant database is loaded from plot-plants.json (sibling file in repo).
// We fetch it before running any application code so 'plants' is defined
// when scorePlant() and the plant-lookup .find() run later.
var PLANTS_URL = 'https://cdn.jsdelivr.net/gh/VinnyBaine/Plant_Picker@main/plot-plants.json?v=28';
var plants = [];

fetch(PLANTS_URL)
  .then(function(r){ if(!r.ok) throw new Error('Plants fetch failed: ' + r.status); return r.json(); })
  .then(function(data){
    plants = data;
    init();
  })
  .catch(function(err){
    console.error('[Plot] Could not load plant database:', err);
    // Show a friendly error in the page if the user is on the finder
    var root = document.getElementById('vgpf-root');
    if (root) {
      root.innerHTML = '<div style="padding:40px;text-align:center;font-family:Inter,sans-serif;color:#1f2a1a"><p>Sorry — the plant database failed to load. Please refresh the page.</p></div>';
    }
  });

function init(){
var answers = {}, history = [], currentStep = 1, totalSteps = 5;
var labels = {
region: {bucks:"Buckinghamshire", berks:"Berkshire", herts:"Hertfordshire", oxon:"Oxfordshire"},
soil: {clay:"Heavy clay", loam:"Regular soil", sandy:"Sandy soil", chalky:"Chalky soil"},
light: {full:"Full sun", partial:"Partial sun", shade:"Shade"},
priority: {"low-maintenance":"Low maintenance", pollinators:"Pollinators", colour:"Year-round colour", "deer-resistant":"Deer resistant"},
size: {pot:"Pots", "small-border":"Small border", "medium-border":"Medium border", large:"Large garden"}
};
function $(id){return document.getElementById(id);}
function getHeaderOffset(){
var header=document.querySelector("#header")||document.querySelector(".header-announcement-bar-wrapper")||document.querySelector("header");
if(header){
var h=header.getBoundingClientRect().height;
if(h>0&&h<300)return h+30;
}
return 140;
}
function centerToolInViewport(){
var tool=$("vgpf-tool");if(!tool)return;
var rect=tool.getBoundingClientRect();
var toolHeight=rect.height;
var viewportHeight=window.innerHeight;
var absoluteTop=rect.top+window.pageYOffset;
var desiredTop=absoluteTop-Math.max(getHeaderOffset(),(viewportHeight-toolHeight)/2);
if(desiredTop<0)desiredTop=0;
window.scrollTo({top:desiredTop,behavior:"smooth"});
}
function showPhase(name){
document.querySelectorAll(".vgpf-phase").forEach(function(p){p.classList.remove("active");});
$("vgpf-phase-"+name).classList.add("active");
var content=$("vgpf-content");
if(name==="quiz"){
content.classList.add("vgpf-hidden");
setTimeout(centerToolInViewport,60);
}else if(name==="results"){
content.classList.remove("vgpf-hidden");
setTimeout(function(){
try{
var results=$("vgpf-phase-results");
var rect=results.getBoundingClientRect();
var absoluteTop=rect.top+window.pageYOffset;
// Scroll so results header sits 60px from top, gives breathing room below nav
window.scrollTo({top:absoluteTop-getHeaderOffset(),behavior:"smooth"});
}catch(e){}
},60);
}else{
content.classList.remove("vgpf-hidden");
setTimeout(function(){
try{$("vgpf-root").scrollIntoView({behavior:"smooth",block:"start"});}catch(e){}
},60);
}
}
function showStep(n){
document.querySelectorAll(".vgpf-step").forEach(function(s){s.classList.remove("active");});
if(n<=totalSteps){
$("vgpf-step-"+n).classList.add("active");
$("vgpf-step-label").textContent="Question "+n+" of "+totalSteps;
$("vgpf-progress").style.width=(n/totalSteps*100)+"%";
$("vgpf-back").style.visibility=n>1?"visible":"hidden";
}else{
renderResults();
showPhase("results");
}
}
$("vgpf-start-btn").addEventListener("click",function(){
showPhase("quiz");
showStep(1);
});
document.querySelectorAll(".vgpf-opts").forEach(function(group){
group.addEventListener("click",function(e){
var btn=e.target.closest(".vgpf-opt");
if(!btn)return;
group.querySelectorAll(".vgpf-opt").forEach(function(b){b.classList.remove("sel");});
btn.classList.add("sel");
answers[group.dataset.key]=btn.dataset.val;
history.push(currentStep);
setTimeout(function(){currentStep++;showStep(currentStep);},200);
});
});
$("vgpf-back").addEventListener("click",function(){
if(history.length>0){currentStep=history.pop();showStep(currentStep);}
});
$("vgpf-restart").addEventListener("click",function(){
Object.keys(answers).forEach(function(k){delete answers[k];});
history.length=0;currentStep=1;
activeFilters=[];
document.querySelectorAll(".vgpf-opt").forEach(function(b){b.classList.remove("sel");});
document.querySelectorAll(".vgpf-filter-chip").forEach(function(b){b.classList.remove("active");});
showPhase("intro");
});
function scorePlant(plant){
var score=0;
// Region (upweighted to 2)
if(plant.region.indexOf(answers.region)!==-1)score+=2;
// Soil match + specialist bonus
if(plant.soil.indexOf(answers.soil)!==-1){
score+=4;
if(plant.soil.length<=2)score+=2;
else if(plant.soil.length===3)score+=1;
}
// Light match + specialist bonus
if(plant.light.indexOf(answers.light)!==-1){
score+=4;
if(plant.light.length===1)score+=2;
else if(plant.light.length===2)score+=1;
}
// Priority match
if(plant.priority.indexOf(answers.priority)!==-1)score+=3;
// Size match
if(plant.size.indexOf(answers.size)!==-1)score+=1;
return score;
}
function nameHash(name){
var h=0;
for(var i=0;i<name.length;i++)h+=name.charCodeAt(i);
return h%1000;
}
// Diversity-aware top-N selector. Penalises repeated plant_type to surface a varied result page.
function selectTopWithDiversity(scored, maxResults){
var penalties=[0,-1,-3,-5,-5,-5,-5,-5];
var remaining=scored.slice().sort(function(a,b){
if(b.score!==a.score)return b.score-a.score;
return nameHash(a.plant.name)-nameHash(b.plant.name);
});
var selected=[];
var typeCount={};
while(selected.length<maxResults && remaining.length>0){
var bestIdx=0,bestAdj=-Infinity,bestRaw=-Infinity,bestHash=Infinity;
for(var i=0;i<remaining.length;i++){
var c=remaining[i];
var t=c.plant.type||'perennial';
var n=typeCount[t]||0;
var pen=penalties[Math.min(n,penalties.length-1)];
var adj=c.score+pen;
var h=nameHash(c.plant.name);
if(adj>bestAdj || (adj===bestAdj && c.score>bestRaw) || (adj===bestAdj && c.score===bestRaw && h<bestHash)){
bestIdx=i; bestAdj=adj; bestRaw=c.score; bestHash=h;
}
}
var picked=remaining.splice(bestIdx,1)[0];
var pt=picked.plant.type||'perennial';
typeCount[pt]=(typeCount[pt]||0)+1;
selected.push(picked);
}
return selected;
}
function makeViz(plant){
if(plant.image){return "<img src=\""+plant.image+"\" alt=\""+plant.name+"\" loading=\"lazy\">";}
var colors=["#D4537E","#7F77DD","#EF9F27","#82b47e","#F4C0D1","#534AB7","#D85A30","#97C459"];
var hash=0;for(var i=0;i<plant.name.length;i++)hash+=plant.name.charCodeAt(i);
var c=colors[hash%8];
return "<svg viewBox=\"0 0 120 160\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\" preserveAspectRatio=\"xMidYMid slice\"><rect width=\"120\" height=\"160\" fill=\"#f4f9f5\"/><circle cx=\"60\" cy=\"70\" r=\"28\" fill=\""+c+"\" opacity=\"0.85\"/><circle cx=\"60\" cy=\"70\" r=\"10\" fill=\"#BA7517\"/><text x=\"60\" y=\"130\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"9\" fill=\"#6b7560\">image placeholder</text></svg>";
}
var activeFilters=[];
var lastEligible=[]; // all plants meeting threshold (NOT yet sliced to 8)
var lastDisplayed=[]; // plants currently shown (after filters + diversity selection, capped at 8)
function renderResults(){
// Score every plant once; keep all that meet threshold (not yet capped)
lastEligible=plants.map(function(p){return {plant:p,score:scorePlant(p)};}).filter(function(s){return s.score>=10;});
applyFilters();
var regionName=labels.region[answers.region]||"your area";
var chips=$("vgpf-chips");chips.innerHTML="";
["region","soil","light","priority","size"].forEach(function(k){
if(answers[k]){
var chip=document.createElement("span");
chip.className="vgpf-chip";
chip.textContent=labels[k][answers[k]];
chips.appendChild(chip);
}
});
updateFilterCounts();
}
function applyFilters(){
// Filter BEFORE selection so diversity operates on the right pool
var pool=lastEligible;
if(activeFilters.length>0){
pool=lastEligible.filter(function(s){
return activeFilters.every(function(f){return s.plant.tags && s.plant.tags.indexOf(f)!==-1;});
});
}
// Apply diversity-aware top-8 selection
var displayed=selectTopWithDiversity(pool,8);
lastDisplayed=displayed;
var grid=$("vgpf-grid");grid.innerHTML="";
if(displayed.length===0){
var msg=activeFilters.length>0?"No plants match all your filters. Try removing one, or speak to us for a custom plan.":"No perfect matches, but our team can design a custom plan for your exact conditions.";
grid.innerHTML="<p style=\"grid-column:1/-1;text-align:center;color:#6b7560;padding:20px\">"+msg+"</p>";
}else{
displayed.forEach(function(s){
var plant=s.plant;
var tagHtml=plant.priority.slice(0,3).map(function(p){return "<span class=\"vgpf-tag\">"+labels.priority[p]+"</span>";}).join("");
var card=document.createElement("div");
card.className="vgpf-card";
card.innerHTML="<div class=\"vgpf-viz\">"+makeViz(plant)+"</div><div class=\"vgpf-body\"><div class=\"vgpf-name\">"+plant.name+"</div><div class=\"vgpf-latin\">"+plant.latin+"</div><div class=\"vgpf-desc\">"+plant.desc+"</div>"+(plant.note?"<div class=\"vgpf-note\">"+plant.note+"</div>":"")+"<div class=\"vgpf-tags\">"+tagHtml+"</div></div>";
grid.appendChild(card);
});
}
var regionName=labels.region[answers.region]||"your area";
var countText="We found "+displayed.length+" plants that should thrive in your "+regionName+" garden";
if(activeFilters.length>0)countText+=" (filtered)";
$("vgpf-results-count").textContent=countText;
}
function updateFilterCounts(){
document.querySelectorAll(".vgpf-filter-chip").forEach(function(chip){
var filter=chip.dataset.filter;
var count=lastEligible.filter(function(s){return s.plant.tags && s.plant.tags.indexOf(filter)!==-1;}).length;
var label=chip.textContent.replace(/\s*\(\d+\)\s*$/,"").trim();
chip.innerHTML=chip.innerHTML.replace(/<span class="vgpf-filter-count">.*?<\/span>/,"");
if(count>0){
chip.insertAdjacentHTML("beforeend"," <span class=\"vgpf-filter-count\">("+count+")</span>");
}
chip.style.display=count>0?"inline-flex":"none";
});
}
document.querySelectorAll(".vgpf-filter-chip").forEach(function(chip){
chip.addEventListener("click",function(){
var filter=chip.dataset.filter;
var idx=activeFilters.indexOf(filter);
if(idx===-1){
activeFilters.push(filter);
chip.classList.add("active");
}else{
activeFilters.splice(idx,1);
chip.classList.remove("active");
}
applyFilters();
});
});
$("vgpf-email").addEventListener("click",function(){
var summary=["region","soil","light","priority","size"].map(function(k){return labels[k][answers[k]];}).join(", ");
window.location.href="mailto:hello@plotapp.uk?subject=Plant finder results&body=Hi, I used the plant finder with these conditions: "+encodeURIComponent(summary)+". Please could you email me the plant list and any additional recommendations?";
});
$("vgpf-share").addEventListener("click",function(){
var url=window.location.href;
var text="I just used Plot, a plant finder for the Home Counties, and found plants that would belong in my garden in under a minute.";
if(navigator.share){try{navigator.share({title:"Plot — A plant finder for the Home Counties",text:text,url:url});}catch(e){}}
else if(navigator.clipboard){navigator.clipboard.writeText(url);var btn=$("vgpf-share");var orig=btn.textContent;btn.textContent="Link copied";setTimeout(function(){btn.textContent=orig;},2000);}
});

// --- PDF GENERATION (v14, template-rendered) ---
var userName = "";
var refNum = "PL-" + String(Math.floor(Math.random()*9000) + 1000);

function openNameModal() {
$("vgpf-modal-backdrop").classList.add("open");
setTimeout(function(){ $("vgpf-modal-name").focus(); }, 100);
}
function closeNameModal() {
$("vgpf-modal-backdrop").classList.remove("open");
}

// Name modal skipped - go straight to PDF generation
$("vgpf-pdf").addEventListener("click", triggerPDFGeneration);
var pdfTopBtn = $("vgpf-pdf-top");
if (pdfTopBtn) pdfTopBtn.addEventListener("click", triggerPDFGeneration);
$("vgpf-modal-backdrop").addEventListener("click", function(e) {
if (e.target === this) closeNameModal();
});
$("vgpf-modal-skip").addEventListener("click", function() {
userName = "";
closeNameModal();
triggerPDFGeneration();
});
$("vgpf-modal-go").addEventListener("click", function() {
userName = ($("vgpf-modal-name").value || "").trim().slice(0, 40);
closeNameModal();
triggerPDFGeneration();
});
$("vgpf-modal-name").addEventListener("keydown", function(e) {
if (e.key === "Enter") { $("vgpf-modal-go").click(); }
});

function triggerPDFGeneration() {
var btn = $("vgpf-pdf");
var orig = btn.innerHTML;
btn.classList.add("vgpf-pdf-generating");
btn.innerHTML = "Generating...";

// Open loader overlay
var loader = $("vgpf-pdf-loader");
var loaderCard = $("vgpf-pdf-loader-card");
var phaseEl = $("vgpf-pdf-loader-phase");
var subEl = $("vgpf-pdf-loader-sub");
loaderCard.classList.remove("done");
phaseEl.textContent = "Selecting your plants";
subEl.innerHTML = "A moment&hellip;";
loader.classList.add("open");

// Rotate phase messages while html2canvas works (3-6s typical)
var phases = [
{at: 1500, phase: "Loading photographs"},
{at: 3500, phase: "Composing your plan"}
];
var phaseTimers = [];
phases.forEach(function(p) {
phaseTimers.push(setTimeout(function() {
phaseEl.textContent = p.phase;
}, p.at));
});

function clearPhaseTimers() {
phaseTimers.forEach(function(t) { clearTimeout(t); });
phaseTimers = [];
}

function closeLoader(delay) {
setTimeout(function() {
loader.classList.remove("open");
}, delay || 0);
}

setTimeout(function() {
generatePDF().then(function() {
clearPhaseTimers();
loaderCard.classList.add("done");
phaseEl.textContent = "Ready";
subEl.textContent = "";
closeLoader(700);
btn.classList.remove("vgpf-pdf-generating");
btn.innerHTML = orig;
}).catch(function(e) {
console.error("PDF failed:", e);
clearPhaseTimers();
closeLoader(0);
btn.classList.remove("vgpf-pdf-generating");
btn.innerHTML = orig;
alert("Sorry, PDF generation failed. Please try again.");
});
}, 100);
}

function getDisplayedPlants() {
// Use lastDisplayed (from applyFilters) so PDF matches what's on screen
if (typeof lastDisplayed !== 'undefined' && lastDisplayed.length > 0) {
return lastDisplayed.map(function(s){return s.plant;}).slice(0,8);
}
// Fallback: read from DOM
var grid = $("vgpf-grid");
var cards = grid.querySelectorAll(".vgpf-card");
var result = [];
cards.forEach(function(card) {
var name = card.querySelector(".vgpf-name").textContent;
var plant = plants.find(function(p) { return p.name === name; });
if (plant) result.push(plant);
});
return result.slice(0, 8);
}

function populatePDFTemplates(displayedPlants) {
var today = new Date();
var dateStr = today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

// Logos are inlined directly in the PDF template HTML as <svg> elements.
// No fetching, no preload race, no mobile rendering issues with html2canvas.

// Cover page
$("vgpf-pdf-ref").textContent = refNum;
$("vgpf-pdf-date").textContent = dateStr.toUpperCase();
$("vgpf-pdf-name").textContent = userName || "A Home Counties gardener";

var regionName = labels.region[answers.region] || "";
var coverSub = "Eight plants carefully selected for your " + regionName + " garden, matched to your soil, light, and the way you want it to feel.";
$("vgpf-pdf-cover-sub").textContent = coverSub;

$("vgpf-pdf-c-region").textContent = labels.region[answers.region] || ",";
$("vgpf-pdf-c-soil").textContent = labels.soil[answers.soil] || ",";
$("vgpf-pdf-c-light").textContent = labels.light[answers.light] || ",";
$("vgpf-pdf-c-priority").textContent = labels.priority[answers.priority] || ",";
$("vgpf-pdf-c-size").textContent = labels.size[answers.size] || ",";

// Page 2 meta
$("vgpf-pdf-p2-meta").textContent = "Two";
$("vgpf-pdf-p2b-meta").textContent = "Three";
$("vgpf-pdf-p4-meta").textContent = refNum + " \u00B7 " + dateStr;

// Page 2 + 3: Plant grid split 4 + 4 across two pages
var gridEl1 = $("vgpf-pdf-plant-grid-1");
var gridEl2 = $("vgpf-pdf-plant-grid-2");
gridEl1.innerHTML = "";
gridEl2.innerHTML = "";
displayedPlants.forEach(function(plant, i) {
var imgHtml = plant.image
? '<img src="' + plant.image + '" alt="" crossorigin="anonymous" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><div class="vgpf-pdf-plant-img-placeholder" style="display:none">image coming soon</div>'
: '<div class="vgpf-pdf-plant-img-placeholder" style="display:flex">image coming soon</div>';

var cardHTML =
'<div class="vgpf-pdf-plant-card">' +
'<div class="vgpf-pdf-plant-num">' + String(i + 1).padStart(2, '0') + '</div>' +
'<div class="vgpf-pdf-plant-img">' + imgHtml + '</div>' +
'<div class="vgpf-pdf-plant-body">' +
'<div class="vgpf-pdf-plant-name">' + plant.name + '</div>' +
'<div class="vgpf-pdf-plant-latin">' + plant.latin + '</div>' +
'<div class="vgpf-pdf-plant-desc">' + plant.desc + '</div>' +
(plant.note ? '<div class="vgpf-pdf-plant-rule"></div><div class="vgpf-pdf-plant-note">' + plant.note + '</div>' : '') +
'</div></div>';

// First 4 plants on page 2, plants 5-8 on page 3
var targetGrid = (i < 4) ? gridEl1 : gridEl2;
targetGrid.insertAdjacentHTML("beforeend", cardHTML);
});

// Page 3: Calendar
var calRows = $("vgpf-pdf-cal-rows");
calRows.innerHTML = "";
displayedPlants.forEach(function(plant) {
var flower = plant.flower || [];
var plantM = plant.plant_m || [];
var cells = "";
for (var m = 1; m <= 12; m++) {
cells += '<div class="vgpf-pdf-cal-cell">';
if (flower.indexOf(m) !== -1) cells += '<div class="vgpf-pdf-cal-bar-flower"></div>';
if (plantM.indexOf(m) !== -1) cells += '<div class="vgpf-pdf-cal-bar-plant"></div>';
cells += '</div>';
}
var row =
'<div class="vgpf-pdf-cal-row">' +
'<div class="vgpf-pdf-cal-name">' +
'<div class="vgpf-pdf-cal-name-main">' + plant.name + '</div>' +
'<div class="vgpf-pdf-cal-name-latin">' + plant.latin + '</div>' +
'</div>' + cells +
'</div>';
calRows.insertAdjacentHTML("beforeend", row);
});
}

function preloadImages(urls) {
return Promise.all(urls.map(function(url) {
return new Promise(function(resolve) {
if (!url) { resolve(); return; }
var img = new Image();
img.crossOrigin = "anonymous";
img.onload = function() { resolve(); };
img.onerror = function() { resolve(); };
img.src = url;
});
}));
}

async function generatePDF() {
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch(e) {}
  }

return new Promise(function(resolve, reject) {
try {
var displayed = getDisplayedPlants();
if (displayed.length === 0) { reject("No plants"); return; }

populatePDFTemplates(displayed);

// Preload images
var imageUrls = displayed.map(function(p) { return p.image; }).filter(Boolean);
imageUrls.push("https://raw.githubusercontent.com/VinnyBaine/Plant_Picker/main/pdf-hero.jpg");
imageUrls.push("https://raw.githubusercontent.com/VinnyBaine/Plant_Picker/main/pdf-cta.jpg");
imageUrls.push("https://raw.githubusercontent.com/VinnyBaine/Plant_Picker/main/pdf-accent.jpg");

preloadImages(imageUrls).then(function() {
// Let fonts/layout settle
setTimeout(function() {
renderPagesToPDF(displayed).then(resolve).catch(reject);
}, 400);
});
} catch (e) { reject(e); }
});
}

function renderPagesToPDF(displayed) {
return new Promise(function(resolve, reject) {
try {
var jsPDF = window.jspdf.jsPDF;
var pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

var pageIds = ["vgpf-pdf-page-1", "vgpf-pdf-page-2", "vgpf-pdf-page-2b", "vgpf-pdf-page-3", "vgpf-pdf-page-4"];
var idx = 0;

function renderNext() {
if (idx >= pageIds.length) {
var slug = (userName || "garden").toLowerCase().replace(/[^a-z0-9]/g, "-");
pdf.save("vivid-gardens-plant-plan-" + slug + ".pdf");
resolve();
return;
}
var el = $(pageIds[idx]);
html2canvas(el, {
scale: 2,
backgroundColor: "#F4EFE6",
logging: false,
useCORS: true,
allowTaint: true,
width: 794,
height: 1123,
windowWidth: 794,
windowHeight: 1123
}).then(function(canvas) {
var data = canvas.toDataURL("image/jpeg", 0.92);
if (idx > 0) pdf.addPage();
pdf.addImage(data, "JPEG", 0, 0, 210, 297, undefined, "FAST");
idx++;
renderNext();
}).catch(reject);
}

renderNext();
} catch (e) { reject(e); }
});
}


// === V18 FULLSCREEN TAKEOVER ===
function vgpfFsOpen(){
  var wrap = document.getElementById('vgpf-fs-wrap');
  if (!wrap) return;
  var scrollY = window.pageYOffset || document.documentElement.scrollTop;
  document.body.dataset.vgpfScrollY = String(scrollY);
  document.body.classList.add('vgpf-locked');
  document.body.classList.add('vgpf-fs-open');
  document.body.style.top = '-' + scrollY + 'px';
  wrap.classList.add('vgpf-fs-active');
  if (window.history && window.history.pushState) {
    window.history.pushState({vgpfFs:true}, '');
  }
  setTimeout(function(){ if (wrap.scrollTo) wrap.scrollTo({top:0, behavior:'instant'}); }, 50);
}
function vgpfFsClose(){
  var wrap = document.getElementById('vgpf-fs-wrap');
  if (!wrap || !wrap.classList.contains('vgpf-fs-active')) return;
  wrap.classList.remove('vgpf-fs-active');
  // CRITICAL: also remove the direct-entry class on <html>, otherwise its
  // !important CSS rules keep forcing fullscreen layout even after vgpf-fs-active is gone.
  document.documentElement.classList.remove('vgpf-direct-entry');
  document.body.classList.remove('vgpf-locked');
  document.body.classList.remove('vgpf-fs-open');
  document.body.style.top = '';
  var scrollY = parseInt(document.body.dataset.vgpfScrollY || '0', 10);
  window.scrollTo({top: scrollY, behavior: 'instant'});
  if (window.history && window.history.state && window.history.state.vgpfFs) {
    window.history.back();
  }
}
var vgpfCloseBtn = document.getElementById('vgpf-fs-close');
if (vgpfCloseBtn) vgpfCloseBtn.addEventListener('click', vgpfFsClose);
window.addEventListener('popstate', function(){
  var wrap = document.getElementById('vgpf-fs-wrap');
  if (wrap && wrap.classList.contains('vgpf-fs-active')) {
    wrap.classList.remove('vgpf-fs-active');
    document.documentElement.classList.remove('vgpf-direct-entry');
    document.body.classList.remove('vgpf-locked');
    document.body.classList.remove('vgpf-fs-open');
    document.body.style.top = '';
    var scrollY = parseInt(document.body.dataset.vgpfScrollY || '0', 10);
    window.scrollTo({top: scrollY, behavior: 'instant'});
  }
});
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') {
    var wrap = document.getElementById('vgpf-fs-wrap');
    if (wrap && wrap.classList.contains('vgpf-fs-active')) vgpfFsClose();
  }
});
// Mode toggle removed - smooth animation locked in

// Hook fullscreen open into Get Started button
var vgpfStartObs = setInterval(function(){
  var startBtn = document.getElementById('vgpf-start-btn');
  if (startBtn && !startBtn.dataset.vgpfFsHooked) {
    startBtn.dataset.vgpfFsHooked = '1';
    startBtn.addEventListener('click', function(){
      if (window.innerWidth < 1024) vgpfFsOpen();
    });
    clearInterval(vgpfStartObs);
  }
}, 100);
setTimeout(function(){ clearInterval(vgpfStartObs); }, 5000);

// === V18 AUTO-OPEN ON DIRECT ENTRY ===
// If the user arrived via a hash trigger (#start or #open) OR is on mobile
// landing directly without internal referrer, auto-expand to fullscreen with
// a calm fade-up entry animation (different from the button-press clip expand).
function vgpfShouldAutoOpen(){
  var hash = (window.location.hash || '').toLowerCase();
  if (hash === '#start' || hash === '#open' || hash === '#fullscreen') return true;
  
  // Mobile direct entry detection: no referrer or referrer from a different origin
  if (window.innerWidth < 1024) {
    try {
      var ref = document.referrer || '';
      // No referrer at all = direct visit (typed URL, QR code, app link)
      if (!ref) return true;
      // Different origin = arrived from search/social/email
      var refOrigin = new URL(ref).origin;
      if (refOrigin !== window.location.origin) return true;
    } catch(e) {
      // If URL parsing fails on legacy browsers, fall back to no-auto-open
    }
  }
  return false;
}

function vgpfAutoOpenOnLoad(){
  if (!vgpfShouldAutoOpen()) return;
  var wrap = document.getElementById('vgpf-fs-wrap');
  if (!wrap) return;
  
  // For direct entry: use INSTANT mode - no animation at all, no flash.
  // The user came directly to the tool, so there's no "embedded state" worth showing.
  wrap.classList.remove('vgpf-fs-smooth');
  wrap.classList.add('vgpf-fs-instant');
  
  // Lock body
  var scrollY = window.pageYOffset || document.documentElement.scrollTop;
  document.body.dataset.vgpfScrollY = String(scrollY);
  document.body.classList.add('vgpf-locked');
  document.body.classList.add('vgpf-fs-open');
  document.body.style.top = '-' + scrollY + 'px';
  
  // Activate fullscreen instantly
  wrap.classList.add('vgpf-fs-active');
  
  // Push history state so back button closes fullscreen and returns to non-fullscreen page state
  if (window.history && window.history.pushState) {
    window.history.pushState({vgpfFs:true}, '');
  }
  
  // After a brief moment, restore smooth class for any subsequent button-triggered opens
  setTimeout(function(){
    wrap.classList.remove('vgpf-fs-instant');
    wrap.classList.add('vgpf-fs-smooth');
  }, 100);
}

// Run after DOM is ready (and after existing init)

// Sticky bar shadow trigger - adds 'is-stuck' class when scrolled
(function(){
  var stickyBar = document.getElementById('vgpf-sticky-bar');
  if (!stickyBar || !window.IntersectionObserver) return;
  var sentinel = document.createElement('div');
  sentinel.style.cssText = 'position:absolute;top:-1px;height:1px;width:1px;visibility:hidden';
  stickyBar.parentNode.insertBefore(sentinel, stickyBar);
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (entry.intersectionRatio === 0) {
        stickyBar.classList.add('is-stuck');
      } else {
        stickyBar.classList.remove('is-stuck');
      }
    });
  }, {threshold:[0]});
  observer.observe(sentinel);
})();

// Run direct-entry detection IMMEDIATELY (no setTimeout delay) so we apply 
// fullscreen state before the first paint. This prevents the brief flash of 
// embedded layout that would otherwise appear.
function vgpfTryAutoOpenEarly(){
  var wrap = document.getElementById('vgpf-fs-wrap');
  if (!wrap) {
    // DOM not ready yet - retry on next animation frame
    requestAnimationFrame(vgpfTryAutoOpenEarly);
    return;
  }
  vgpfAutoOpenOnLoad();
}
vgpfTryAutoOpenEarly();

} // end init()

})();
