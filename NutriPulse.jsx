import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { App as CapApp } from "@capacitor/app";
import {
  Home, Camera, Sparkles, TrendingUp, Droplet, Plus, X, Check, Search,
  Flame, Dumbbell, Utensils, Send, ChevronRight, ChevronLeft, Pencil, Upload, Info,
  ArrowLeftRight, ArrowRight, Trash2, Bell, Mic, MicOff, Star, Barcode, Video, VideoOff, RefreshCw, Download
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, ReferenceLine
} from "recharts";
import {
  fetchMeals, insertMeal, removeMealFromDb,
  fetchActivities, insertActivity, removeActivityFromDb,
  fetchDailyStats, saveWaterIntake, saveReminderSettings,
  fetchUserGoals, saveUserGoals,
  fetchFavorites, insertFavorite, removeFavorite,
  fetchPastHistoryFromDb
} from "./src/db/neon.js";
import {
  analyzeFoodImage, askDietitian, getDailyRecommendation, parseSpokenMeal,
  lookupProductByBarcodeAI, estimateProductByBarcodeAI, analyzeNutritionLabel, parseAudioMeal
} from "./src/ai/gemini.js";
import { uploadImageToCloudinary } from "./src/utils/cloudinary.js";
import { showNotification, scheduleHydrationReminders, requestNotificationPermission } from "./src/utils/notifications.js";
import IntroScreen from "./src/components/IntroScreen.jsx";

const CSS = `

:root{
  --bg:#F5F3ED;
  --surface:#FFFFFF;
  --surface-2:#FBFAF6;
  --ink:#1C2B24;
  --ink-soft:#6E7B73;
  --ink-faint:#9CA69E;
  --line:#E5E1D3;
  --line-strong:#1C2B24;
  --brand:#1F5D4C;
  --brand-soft:#E4EEE9;
  --accent:#FF6B47;
  --accent-soft:#FFE7DE;
  --protein:#3E6FE0;
  --protein-soft:#E7EDFC;
  --carbs:#E8A23D;
  --carbs-soft:#FBEEDA;
  --fat:#3FA872;
  --fat-soft:#E1F2E8;
  --fiber:#8B6CC1;
  --water:#1FB6C9;
  --water-soft:#DFF6F8;
  --danger:#D6503F;
  --radius-s:10px;
  --radius-m:16px;
  --radius-l:24px;
  --font-display: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
  --font-body: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
  --font-num: 'Plus Jakarta Sans', 'Oswald', sans-serif;
}

*{box-sizing:border-box;}
.np-root{
  font-family:var(--font-body);
  color:var(--ink);
  background:var(--bg);
  min-height:100vh;
  display:flex;
  justify-content:center;
  padding:0;
  -webkit-font-smoothing:antialiased;
}
.np-root, .np-root *{ scrollbar-width: thin; }
.np-phone{
  width:100%;
  max-width:430px;
  min-height:100vh;
  background:var(--surface-2);
  display:flex;
  flex-direction:column;
  position:relative;
  border-left:1px solid var(--line);
  border-right:1px solid var(--line);
  overflow:hidden;
}
@media(min-width:560px){
  .np-root{ padding:28px 12px; }
  .np-phone{
    min-height:860px;
    max-height:860px;
    border-radius:36px;
    overflow:hidden;
    box-shadow:0 30px 60px -20px rgba(28,43,36,0.35), 0 0 0 10px #0B120E;
  }
}

.np-scroll{ flex:1; overflow-y:auto; padding:0 18px 100px; }

/* Top bar */
.np-topbar{
  padding:20px 18px 14px;
  display:flex; align-items:center; justify-content:space-between;
  background:var(--surface-2);
  position:sticky; top:0; z-index:5;
}
.np-word{
  font-family:var(--font-display); font-weight:800; font-size:20px;
  letter-spacing:-0.02em; color:var(--ink); display:flex; align-items:center; gap:7px;
}
.np-word .dot{ width:9px; height:9px; border-radius:50%; background:var(--accent); display:inline-block; }
.np-date{ font-size:12px; color:var(--ink-soft); font-weight:500; margin-top:2px; }
.np-streak{
  display:flex; align-items:center; gap:5px; font-size:12px; font-weight:700;
  background:var(--accent-soft); color:#B8461F; padding:6px 11px; border-radius:20px;
}

/* Tab bar */
.np-tabbar{
  display:flex; border-top:1px solid var(--line); background:var(--surface);
  padding:8px 6px calc(env(safe-area-inset-bottom,0px) + 8px);
  position:sticky; bottom:0; z-index:6;
}
.np-tab{
  flex:1; display:flex; flex-direction:column; align-items:center; gap:3px;
  padding:6px 2px; border-radius:14px; background:none; border:none; cursor:pointer;
  color:var(--ink-faint); font-family:var(--font-body); font-size:11px; font-weight:600;
}
.np-tab.active{ color:var(--brand); }
.np-tab .ico-wrap{
  width:34px; height:26px; border-radius:10px; display:flex; align-items:center; justify-content:center;
}
.np-tab.active .ico-wrap{ background:var(--brand-soft); }

/* Section heading */
.np-h1{
  font-family:var(--font-display); font-size:23px; font-weight:800;
  letter-spacing:-0.025em; color:var(--ink); margin:14px 0 4px;
}
.np-sub{
  font-size:13px; color:var(--ink-soft); font-weight:500;
  margin-bottom:16px; line-height:1.45;
}

/* Generic card */
.np-card{
  background:var(--surface); border:1px solid var(--line); border-radius:18px;
  padding:18px; margin-bottom:14px; box-shadow:0 4px 16px -4px rgba(28,43,36,0.04);
}
.np-card-title{
  font-family:var(--font-display); font-size:12px; font-weight:800;
  text-transform:uppercase; letter-spacing:0.05em; color:var(--ink-soft); margin-bottom:12px;
}

/* Ring */
.np-ring-row{ display:flex; align-items:center; gap:18px; }
.np-ring-stat{ font-family:var(--font-display); font-size:30px; font-weight:800; line-height:1; letter-spacing:-0.02em; }
.np-ring-label{ font-size:11.5px; color:var(--ink-soft); margin-top:3px; }
.np-mini-macros{ display:flex; gap:14px; margin-top:14px; }
.np-mini-macro{ flex:1; }
.np-mini-macro-top{ display:flex; justify-content:space-between; font-size:11px; font-weight:600; margin-bottom:5px; }
.np-mini-bar-track{ height:6px; border-radius:4px; background:var(--line); overflow:hidden; }
.np-mini-bar-fill{ height:100%; border-radius:4px; }

/* Nutrition facts panel */
.nf-panel{ background:var(--surface); border:3px solid var(--ink); border-radius:6px; padding:14px 16px 10px; margin-bottom:14px; }
.nf-title{ font-family:'Oswald',sans-serif; font-weight:700; font-size:20px; letter-spacing:0.2px; }
.nf-serving{ font-size:11.5px; color:var(--ink-soft); border-bottom:8px solid var(--ink); padding-bottom:8px; margin-top:2px; }
.nf-cal-row{ display:flex; justify-content:space-between; align-items:flex-end; padding:8px 0; border-bottom:4px solid var(--ink); }
.nf-cal-label{ font-family:'Oswald',sans-serif; font-weight:700; font-size:15px; }
.nf-cal-value{ font-family:'Oswald',sans-serif; font-weight:700; font-size:30px; font-variant-numeric:tabular-nums; }
.nf-net{ font-size:11px; color:var(--ink-soft); text-align:right; }
.nf-row{ display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1px solid var(--line); }
.nf-row:last-child{ border-bottom:none; }
.nf-swatch{ width:10px; height:10px; border-radius:3px; flex-shrink:0; }
.nf-name{ font-size:13px; font-weight:600; width:64px; flex-shrink:0; }
.nf-track{ flex:1; height:7px; border-radius:4px; background:var(--line); overflow:hidden; }
.nf-fill{ height:100%; border-radius:4px; }
.nf-amt{ font-size:12px; font-weight:600; color:var(--ink-soft); font-variant-numeric:tabular-nums; width:74px; text-align:right; flex-shrink:0; }

/* Buttons */
.np-btn{
  font-family:var(--font-display); font-weight:700; font-size:13.5px; border-radius:14px; border:none;
  padding:12px 18px; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer;
  letter-spacing:-0.01em; transition:all 0.15s ease;
}
.np-btn-accent{
  background:linear-gradient(135deg, #FF7B59 0%, #E85532 100%);
  color:#fff; box-shadow:0 4px 14px rgba(232,85,50,0.25);
}
.np-btn-accent:hover{ box-shadow:0 6px 20px rgba(232,85,50,0.35); transform:translateY(-1px); }
.np-btn-brand{
  background:linear-gradient(135deg, #256B58 0%, #1A5243 100%);
  color:#fff; box-shadow:0 4px 14px rgba(26,82,67,0.25);
}
.np-btn-ghost{ background:var(--surface); color:var(--ink); border:1.5px solid var(--line); }
.np-btn-ghost:hover{ border-color:var(--brand); background:var(--surface-2); }
.np-btn-sm{ padding:8px 13px; font-size:12px; border-radius:10px; }
.np-btn:active{ transform:scale(0.98); }
.np-btn:disabled{ opacity:0.55; cursor:not-allowed; transform:none !important; box-shadow:none !important; }
.np-row-btns{ display:flex; gap:10px; }

/* Voice sample pills */
.np-voice-pill{
  background:var(--surface-2); border:1.5px solid var(--line); border-radius:999px;
  padding:7px 14px; font-family:var(--font-body); font-size:12px; font-weight:600;
  color:var(--ink); cursor:pointer; transition:all 0.15s ease;
  display:inline-flex; align-items:center; gap:6px; white-space:nowrap;
}
.np-voice-pill:hover{
  border-color:var(--brand); background:#fff; transform:translateY(-1px);
  box-shadow:0 2px 8px rgba(0,0,0,0.05);
}
.np-voice-pill:active{ transform:scale(0.97); }

/* Water card */
.np-water-card{ background:linear-gradient(135deg,var(--water-soft),#F3FBFC); border:1px solid var(--line); border-radius:var(--radius-m); padding:16px; margin-bottom:14px; }
.np-water-top{ display:flex; align-items:center; justify-content:space-between; }
.np-water-qty{ font-family:'Oswald',sans-serif; font-size:24px; font-weight:600; color:var(--water); }
.np-chip{
  background:#fff; border:1.5px solid var(--water); color:var(--water); font-weight:700; font-size:12.5px;
  border-radius:20px; padding:8px 14px; display:flex; align-items:center; gap:5px; cursor:pointer;
}
.np-chip:active{ transform:scale(0.96); }
.np-water-track{ height:9px; border-radius:6px; background:#fff; margin-top:12px; overflow:hidden; }
.np-water-fill{ height:100%; background:var(--water); border-radius:6px; }
.np-reminder-row{ display:flex; align-items:center; justify-content:space-between; margin-top:12px; padding-top:12px; border-top:1px dashed #BFE4E8; font-size:12px; color:#12727D; }

/* Toggle switch */
.np-switch{ width:38px; height:22px; border-radius:20px; position:relative; cursor:pointer; flex-shrink:0; transition:background .15s; }
.np-switch .knob{ width:18px; height:18px; border-radius:50%; background:#fff; position:absolute; top:2px; transition:left .15s; box-shadow:0 1px 3px rgba(0,0,0,.3); }

/* Log list */
.np-log-item{ display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid var(--line); }
.np-log-item:last-child{ border-bottom:none; }
.np-log-ico{ width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.np-log-name{ font-size:13.5px; font-weight:600; }
.np-log-sub{ font-size:11.5px; color:var(--ink-soft); margin-top:1px; }
.np-log-val{ font-family:'Oswald',sans-serif; font-weight:600; font-size:15px; }
.np-log-del{ background:none; border:none; color:var(--ink-faint); cursor:pointer; padding:4px; }
.np-empty{ text-align:center; padding:26px 10px; color:var(--ink-faint); font-size:13px; }

/* FAB */
.np-fab{
  position:absolute; right:18px; bottom:82px; width:54px; height:54px; border-radius:50%;
  background:var(--accent); color:#fff; border:none; display:flex; align-items:center; justify-content:center;
  box-shadow:0 10px 20px -6px rgba(255,107,71,0.6); cursor:pointer; z-index:4;
}

/* Habit Tracker Mini-Button above FAB */
.np-habit-fab{
  height:36px; border-radius:18px;
  background:var(--surface); border:1.5px solid var(--line);
  color:var(--brand); font-family:var(--font-body); font-size:12px; font-weight:700;
  display:flex; align-items:center; gap:6px; padding:0 10px;
  box-shadow:0 6px 16px rgba(28,43,36,0.14); cursor:pointer;
  transition:all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.np-habit-fab:hover{
  background:var(--surface-2); border-color:var(--brand); transform:translateX(-3px);
  box-shadow:0 8px 22px rgba(31,93,76,0.2);
}
.np-habit-item {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 14px; background:var(--surface-2); border:1.5px solid var(--line);
  border-radius:14px; margin-bottom:10px; transition:all 0.2s ease; cursor:pointer;
}
.np-habit-item:hover { border-color:var(--brand); }
.np-habit-item.done { background:#F0FDF4; border-color:#86EFAC; }
.np-habit-check {
  width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  border:2px solid var(--line); background:var(--surface); transition:all 0.2s ease; flex-shrink:0;
}
.np-habit-item.done .np-habit-check {
  background:var(--brand); border-color:var(--brand); color:#fff;
}

/* Modal */
.np-modal-back{ position:absolute; inset:0; background:rgba(28,43,36,0.45); z-index:20; display:flex; align-items:flex-end; }
.np-modal{ background:var(--surface); width:100%; border-radius:22px 22px 0 0; padding:18px 18px calc(env(safe-area-inset-bottom,0px) + 18px); max-height:82%; overflow-y:auto; }
.np-modal-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
.np-modal-title{ font-family:'Oswald',sans-serif; font-size:18px; font-weight:600; }
.np-field{ margin-bottom:12px; }
.np-field label{ font-size:11.5px; font-weight:700; color:var(--ink-soft); text-transform:uppercase; letter-spacing:0.03em; display:block; margin-bottom:6px; }
.np-input{
  width:100%; border:1.5px solid var(--line); border-radius:11px; padding:11px 12px; font-size:14px;
  font-family:'Inter',sans-serif; background:var(--surface-2); color:var(--ink);
}
.np-input:focus{ outline:none; border-color:var(--brand); }
.np-grid2{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.np-grid4{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }

/* Scan */
.np-drop{
  border:2px dashed var(--line); border-radius:var(--radius-m); padding:28px 16px; text-align:center;
  background:var(--surface); margin-bottom:14px;
}
.np-drop-ico{ width:56px; height:56px; border-radius:50%; background:var(--brand-soft); display:flex; align-items:center; justify-content:center; margin:0 auto 12px; color:var(--brand); }
.np-sample-row{ display:flex; gap:10px; overflow-x:auto; padding-bottom:2px; margin-top:12px; }
.np-sample{
  flex-shrink:0; width:88px; text-align:center; background:var(--surface-2); border:1.5px solid var(--line);
  border-radius:14px; padding:10px 6px; cursor:pointer; font-size:11px; font-weight:600;
}
.np-sample .emoji{ font-size:26px; display:block; margin-bottom:5px; }
.np-sample:active{ transform:scale(0.97); }

.np-scan-preview{ width:100%; border-radius:var(--radius-m); overflow:hidden; margin-bottom:14px; border:1px solid var(--line); background:#111; }
.np-scan-preview img{ width:100%; display:block; max-height:200px; object-fit:cover; }
.np-loading-bar{ height:4px; background:var(--line); border-radius:2px; overflow:hidden; margin-top:10px; }
.np-loading-fill{ height:100%; width:40%; background:var(--accent); border-radius:2px; animation:np-load 1.1s ease-in-out infinite; }
@keyframes np-load{ 0%{ margin-left:-40%; } 100%{ margin-left:100%; } }

.np-item-card{ background:var(--surface); border:1px solid var(--line); border-radius:var(--radius-m); padding:14px; margin-bottom:10px; }
.np-item-top{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.np-item-name{ font-weight:700; font-size:14px; }
.np-stepper{ display:flex; align-items:center; gap:10px; }
.np-stepper button{ width:26px; height:26px; border-radius:8px; border:1.5px solid var(--line); background:var(--surface-2); font-weight:700; cursor:pointer; }
.np-macro-tags{ display:flex; gap:8px; flex-wrap:wrap; margin-top:6px; }
.np-tag{ font-size:11px; font-weight:700; padding:4px 9px; border-radius:8px; }

/* Search */
.np-search-bar{ display:flex; align-items:center; gap:8px; background:var(--surface); border:1.5px solid var(--line); border-radius:12px; padding:10px 12px; margin-bottom:12px; }
.np-search-bar input{ border:none; outline:none; background:none; flex:1; font-size:13.5px; font-family:'Inter',sans-serif; }
.np-food-result{ display:flex; align-items:center; justify-content:space-between; padding:11px 4px; border-bottom:1px solid var(--line); cursor:pointer; }
.np-food-result:last-child{ border-bottom:none; }

/* AI tab & Smart Swaps */
.np-suggestion-card{ background:linear-gradient(135deg,var(--brand),#173F33); color:#fff; border-radius:var(--radius-m); padding:18px; margin-bottom:14px; box-shadow:0 4px 18px rgba(31,93,76,0.18); }
.np-suggestion-eyebrow{ display:flex; align-items:center; gap:6px; font-size:11.5px; font-weight:700; opacity:0.9; margin-bottom:8px; letter-spacing:0.04em; text-transform:uppercase; }
.np-suggestion-text{ font-size:14px; line-height:1.55; font-weight:500; }
.np-suggestion-text strong{ color:#FFD166; font-weight:700; }

/* Dynamic Smart Swaps Engine */
.np-swap-alert{
  background:linear-gradient(135deg, #FFFBEB, #FEF3C7); border:1.5px solid #F59E0B;
  border-radius:14px; padding:12px 14px; margin-bottom:14px; font-size:12.5px; color:#92400E;
}
.np-swap-category-chips{ display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:12px; }
.np-swap-chip{
  flex-shrink:0; font-size:11.5px; font-weight:700; padding:6px 12px; border-radius:18px;
  background:var(--surface-2); border:1.5px solid var(--line); color:var(--ink-soft); cursor:pointer;
  transition:all 0.15s ease; white-space:nowrap;
}
.np-swap-chip.active{ background:var(--ink); color:#fff; border-color:var(--ink); }

.np-swap-card{
  background:var(--surface); border:1.5px solid var(--line); border-radius:16px; padding:16px;
  margin-bottom:14px;
}
.np-swap-row{
  display:flex; align-items:flex-start; justify-content:space-between; gap:10px;
  padding:11px 12px; border-radius:12px; background:var(--surface-2); border:1px solid var(--line);
  transition:all 0.15s ease;
}
.np-swap-row:hover{
  background:#F0FDF4; border-color:#86EFAC;
}
.np-swap-pill{
  font-size:10.5px; font-weight:700; padding:2px 7px; border-radius:6px;
  display:inline-flex; align-items:center; gap:3px;
}
.np-swap-pill-cal{ background:#DCFCE7; color:#15803D; }
.np-swap-pill-prot{ background:#DBEAFE; color:#1D4ED8; }
.np-swap-pill-fat{ background:#FEF3C7; color:#B45309; }

.np-swap-log-btn{
  width:100%; font-size:12.5px; padding:9px 12px; border-radius:10px;
  background:var(--brand); color:#fff; border:none; font-weight:700; cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:6px;
  transition:background 0.15s;
}
.np-swap-log-btn:hover{ background:#174639; }

/* Chat & AI message rendering */
.np-chat-wrap{ display:flex; flex-direction:column; height:100%; }
.np-chat-scroll{ flex:1; overflow-y:auto; padding:14px 18px 10px; display:flex; flex-direction:column; gap:12px; }
.np-bubble{ max-width:88%; padding:12px 14px; border-radius:18px; font-size:13.5px; line-height:1.5; }
.np-bubble-ai{
  background:var(--surface); border:1.5px solid var(--line); align-self:flex-start;
  border-bottom-left-radius:4px; color:var(--ink); box-shadow:0 2px 10px rgba(0,0,0,0.03);
}
.np-bubble-user{ background:var(--brand); color:#fff; align-self:flex-end; border-bottom-right-radius:4px; font-weight:500; }
.np-chat-input-bar{ display:flex; gap:8px; padding:10px 18px calc(env(safe-area-inset-bottom,0px) + 10px); background:var(--surface-2); border-top:1px solid var(--line); flex-shrink:0; }
.np-chat-input-bar input{ flex:1; border:1.5px solid var(--line); border-radius:20px; padding:11px 15px; font-size:13.5px; font-family:'Inter',sans-serif; outline:none; background:var(--surface); color:var(--ink); }
.np-send-btn{ width:42px; height:42px; border-radius:50%; background:var(--accent); border:none; color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
.np-quick-prompts{ display:flex; gap:8px; overflow-x:auto; padding:0 18px 10px; flex-shrink:0; }
.np-quick-prompt{ flex-shrink:0; font-size:12px; font-weight:600; background:var(--surface); border:1.5px solid var(--line); border-radius:20px; padding:7px 12px; cursor:pointer; white-space:nowrap; }

/* AI Message Elements */
.np-ai-lead-banner{
  background:var(--brand-soft); color:var(--brand); font-weight:800; font-size:13px;
  padding:8px 11px; border-radius:10px; margin-bottom:8px; border-left:3px solid var(--brand);
}
.np-ai-bullet-item{
  background:var(--surface-2); border:1px solid var(--line); border-radius:10px;
  padding:8px 11px; margin-top:6px; font-size:12.5px; line-height:1.45;
}
.np-ai-bullet-header{
  display:flex; align-items:center; gap:6px; font-weight:700; color:var(--accent);
  margin-bottom:3px; font-size:12px; text-transform:uppercase; letter-spacing:0.02em;
}
.np-ai-bullet-dot{
  width:6px; height:6px; border-radius:50%; background:var(--accent); flex-shrink:0;
}
.np-ai-bullet-simple{
  display:flex; align-items:flex-start; gap:8px; margin-top:6px; font-size:12.5px; line-height:1.45;
}
.np-ai-bullet-body{ color:var(--ink); font-size:12.5px; }
.np-ai-para{ margin-bottom:7px; line-height:1.5; color:var(--ink); }
.np-ai-para:last-child{ margin-bottom:0; }

/* Trends */
.np-range-row{ display:flex; gap:8px; margin-bottom:14px; }
.np-range-btn{ flex:1; padding:9px; border-radius:11px; border:1.5px solid var(--line); background:var(--surface); font-size:12.5px; font-weight:700; cursor:pointer; color:var(--ink-soft); }
.np-range-btn.active{ background:var(--ink); border-color:var(--ink); color:#fff; }
.np-legend-row{ display:flex; gap:14px; margin-top:8px; flex-wrap:wrap; }
.np-legend-item{ display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--ink-soft); font-weight:600; }
.np-legend-dot{ width:9px; height:9px; border-radius:3px; }
.np-highlight-grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.np-highlight{ background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:12px; }
.np-highlight-val{ font-family:'Oswald',sans-serif; font-size:20px; font-weight:600; }
.np-highlight-label{ font-size:11px; color:var(--ink-soft); margin-top:2px; }

/* Voice Logging */
.np-mic-pulse{
  position:absolute; inset:-8px; border-radius:50%; border:2.5px solid #EF4444;
  animation:np-pulse-ring 1.1s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}
@keyframes np-pulse-ring{
  0%{ transform:scale(0.95); opacity:0.9; }
  100%{ transform:scale(1.4); opacity:0; }
}
.np-voice-pill{
  font-family:var(--font-body); font-size:12px; font-weight:600;
  background:var(--surface-2); border:1.5px solid var(--line); border-radius:20px;
  padding:7px 12px; color:var(--ink); cursor:pointer; transition:all 0.15s ease;
  display:inline-flex; align-items:center; gap:5px;
}
.np-voice-pill:hover{
  background:var(--brand-soft); border-color:var(--brand); color:var(--brand);
}

/* Subtabs bar */
.np-subtabs-row{ display:flex; background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:4px; gap:4px; margin-bottom:14px; box-shadow:0 2px 6px rgba(0,0,0,0.02); }
.np-subtab-btn{
  flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:9px 4px;
  border:none; background:transparent; font-family:var(--font-body); font-size:12px; font-weight:600;
  color:var(--ink-soft); border-radius:10px; cursor:pointer; transition:all 0.15s ease;
}
.np-subtab-btn.active{ background:var(--ink); color:#fff; font-weight:700; box-shadow:0 2px 6px rgba(28,43,36,0.18); }

/* Skeleton Shimmer Loaders */
.np-skeleton-card{
  background:var(--surface); border:1.5px solid var(--line); border-radius:var(--radius-m);
  padding:16px; margin-bottom:12px;
}
.np-shimmer{
  background:linear-gradient(90deg, #EBE8DE 25%, #F7F5EE 50%, #EBE8DE 75%);
  background-size:200% 100%;
  animation:np-shimmer-anim 1.4s infinite;
  border-radius:6px;
}
@keyframes np-shimmer-anim{
  0%{ background-position:200% 0; }
  100%{ background-position:-200% 0; }
}

/* Quick-Dock Speed Dial */
.np-dock-backdrop{
  position:absolute; inset:0; background:rgba(28,43,36,0.45); backdrop-filter:blur(3px);
  z-index:15; display:flex; flex-direction:column; justify-content:flex-end;
  padding:0 20px 88px; animation:np-fade-in 0.16s ease;
}
@keyframes np-fade-in{ from{ opacity:0; } to{ opacity:1; } }
.np-dock-menu{
  display:flex; flex-direction:column; gap:10px; align-items:flex-end;
  animation:np-slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes np-slide-up{ from{ transform:translateY(24px); opacity:0; } to{ transform:translateY(0); opacity:1; } }
.np-dock-btn{
  display:flex; align-items:center; gap:11px; background:#fff; border:1px solid var(--line);
  padding:10px 16px; border-radius:24px; box-shadow:0 8px 24px rgba(28,43,36,0.18);
  font-family:var(--font-body); font-size:13px; font-weight:700; color:var(--ink);
  cursor:pointer; transition:transform 0.15s ease, background 0.15s ease;
}
.np-dock-btn:hover{ background:var(--surface-2); transform:scale(1.03); }
.np-dock-btn:active{ transform:scale(0.97); }
.np-dock-ico{
  width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  color:#fff; flex-shrink:0;
}

/* Macro Fit Banner */
.np-macro-fit-banner{
  border-radius:12px; padding:10px 12px; margin-top:10px;
  display:flex; align-items:center; gap:10px; font-size:12px;
}
`;

/* ---------------------------------------------------------------------- */
/* PERFORMANCE OPTIMIZATIONS: Image Compression & Barcode Cache          */
/* ---------------------------------------------------------------------- */
function compressImageBase64(base64Str, maxWidth = 1200, quality = 0.78) {
  if (!base64Str || typeof base64Str !== "string" || !base64Str.startsWith("data:image")) {
    return Promise.resolve(base64Str);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      } catch (e) {
        resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
}

const BARCODE_CACHE_KEY = "nutripulse_barcode_cache_v2";

const PREPOPULATED_BARCODES = {
  "8901491101837": {
    name: "Kurkure Masala Munch (PepsiCo)",
    brand: "Kurkure / PepsiCo",
    category: "Indian Namkeen & Snacks",
    servingSize: "30g",
    calories: 168,
    protein: 1.8,
    carbs: 16.5,
    fat: 10.5,
    fiber: 0.9,
    imageUrl: null,
    country: "India",
    ingredients: "Rice Meal, Edible Vegetable Oil, Corn Meal, Gram Meal, Spices and Condiments (Chilli, Onion, Garlic, Amchur, Coriander, Black Pepper)",
    nutriscore: "D",
    source: "Verified Indian GTIN Cache"
  },
  "8901262010016": {
    name: "Amul Butter (Pasteurised)",
    brand: "Amul / GCMMF",
    category: "Dairy & Butter",
    servingSize: "10g (1 tbsp)",
    calories: 72,
    protein: 0.1,
    carbs: 0.0,
    fat: 8.0,
    fiber: 0.0,
    imageUrl: null,
    country: "India",
    ingredients: "Butter (Milk Fat 80%), Common Salt, Permitted Natural Colour (Annatto)",
    nutriscore: "E",
    source: "Verified Indian GTIN Cache"
  },
  "8901058017687": {
    name: "Maggi 2-Minute Noodles Masala",
    brand: "Maggi / Nestlé",
    category: "Instant Noodles",
    servingSize: "70g (1 pack)",
    calories: 310,
    protein: 6.8,
    carbs: 46.2,
    fat: 11.0,
    fiber: 2.2,
    imageUrl: null,
    country: "India",
    ingredients: "Wheat Flour (Maida), Palm Oil, Salt, Wheat Gluten, Spices (Coriander, Turmeric, Cumin, Aniseed, Fenugreek, Ginger, Clove, Nutmeg, Cardamom)",
    nutriscore: "D",
    source: "Verified Indian GTIN Cache"
  },
  "8901719101014": {
    name: "Parle-G Glucose Biscuits",
    brand: "Parle",
    category: "Biscuits & Cookies",
    servingSize: "50g (8 biscuits)",
    calories: 226,
    protein: 3.3,
    carbs: 38.5,
    fat: 6.5,
    fiber: 1.1,
    imageUrl: null,
    country: "India",
    ingredients: "Wheat Flour, Sugar, Edible Vegetable Oil, Invert Sugar Syrup, Milk Solids, Raising Agents, Salt",
    nutriscore: "D",
    source: "Verified Indian GTIN Cache"
  },
  "030000010402": {
    name: "Quaker Rolled Oats (100% Whole Grain)",
    brand: "Quaker",
    category: "Breakfast Cereals & Oats",
    servingSize: "40g (1/2 cup)",
    calories: 150,
    protein: 5.0,
    carbs: 27.0,
    fat: 3.0,
    fiber: 4.0,
    imageUrl: null,
    country: "Global",
    ingredients: "100% Whole Grain Rolled Oats",
    nutriscore: "A",
    source: "Verified GTIN Registry"
  },
  "3017620422003": {
    name: "Nutella Hazelnut Spread with Cocoa",
    brand: "Ferrero Nutella",
    category: "Sweet Spreads",
    servingSize: "15g (1 tbsp)",
    calories: 81,
    protein: 0.9,
    carbs: 8.6,
    fat: 4.6,
    fiber: 0.5,
    imageUrl: null,
    country: "Global",
    ingredients: "Sugar, Palm Oil, Hazelnuts (13%), Skimmed Milk Powder (8.7%), Fat-Reduced Cocoa (7.4%), Emulsifier (Lecithins Soy), Vanillin",
    nutriscore: "E",
    source: "Verified GTIN Registry"
  }
};

function getCachedBarcode(code) {
  const clean = String(code || "").trim();
  if (!clean) return null;
  if (PREPOPULATED_BARCODES[clean]) return PREPOPULATED_BARCODES[clean];
  try {
    const raw = localStorage.getItem(BARCODE_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[clean] || null;
  } catch (e) {
    return null;
  }
}

function setCachedBarcode(code, data) {
  const clean = String(code || "").trim();
  if (!clean || !data) return;
  try {
    const raw = localStorage.getItem(BARCODE_CACHE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[clean] = { ...data, cachedAt: Date.now() };
    localStorage.setItem(BARCODE_CACHE_KEY, JSON.stringify(map));
  } catch (e) {}
}

/* ---------------------------------------------------------------------- */
/* BASE DATA & CONSTANTS                                                   */
/* ---------------------------------------------------------------------- */
const DEFAULT_GOALS = { calories: 2200, protein: 150, carbs: 220, fat: 70, fiber: 30, water: 2500 };

const FOOD_DB = [
  // Indian Breads & Grains
  { name: "Roti / Chapati (Whole wheat, 1 medium)", calories: 104, protein: 3.1, carbs: 21, fat: 0.8, fiber: 3.5 },
  { name: "Steamed Basmati Rice (1 cup cooked)", calories: 195, protein: 4, carbs: 43, fat: 0.5, fiber: 1 },
  { name: "Brown Rice (1 cup cooked)", calories: 216, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5 },
  { name: "Moong Dal Khichdi (1 bowl, 200g)", calories: 230, protein: 8.5, carbs: 39, fat: 4.5, fiber: 5 },
  { name: "Poha with Peanuts & Veggies (1 bowl)", calories: 210, protein: 4.5, carbs: 38, fat: 4.8, fiber: 2.8 },
  { name: "Upma (Semolina / Rava, 1 cup)", calories: 195, protein: 5, carbs: 34, fat: 4.5, fiber: 3 },
  { name: "Oats Upma with Veggies (1 cup)", calories: 170, protein: 6, carbs: 28, fat: 4, fiber: 4.5 },
  { name: "Oats Porridge / Khichdi (1 cup)", calories: 180, protein: 7, carbs: 30, fat: 4, fiber: 5 },
  { name: "Aloo Paratha with Curd (1 medium)", calories: 280, protein: 6, carbs: 42, fat: 10, fiber: 4 },
  { name: "Methi Thepla (1 piece, 40g)", calories: 110, protein: 3, carbs: 18, fat: 3.2, fiber: 2 },
  { name: "Besan Chilla (2 pancakes)", calories: 190, protein: 10, carbs: 24, fat: 6, fiber: 5 },
  { name: "Ragi Roti / Mudde (1 medium)", calories: 115, protein: 2.5, carbs: 24, fat: 0.6, fiber: 4.2 },

  // South Indian Staples
  { name: "Steamed Idli (2 pcs with Sambar)", calories: 160, protein: 6, carbs: 32, fat: 1.2, fiber: 4 },
  { name: "Plain Dosa (1 medium)", calories: 165, protein: 4, carbs: 28, fat: 4, fiber: 2 },
  { name: "Masala Dosa with Chutney (1 medium)", calories: 250, protein: 5, carbs: 38, fat: 9, fiber: 3 },
  { name: "South Indian Sambar (1 cup, 150ml)", calories: 90, protein: 4, carbs: 14, fat: 2, fiber: 3.5 },
  { name: "South Indian Rasam (1 cup, 150ml)", calories: 55, protein: 1.8, carbs: 9, fat: 1.5, fiber: 1.2 },
  { name: "Curd Rice with Tadka (1 cup, 200g)", calories: 190, protein: 4.5, carbs: 32, fat: 5, fiber: 1 },

  // Dals & Legumes (High Protein & Fiber)
  { name: "Dal Tadka / Yellow Lentils (1 cup, 200g)", calories: 165, protein: 9.2, carbs: 22, fat: 4.5, fiber: 6.8 },
  { name: "Rajma Masala / Kidney Beans (1 cup)", calories: 215, protein: 11.2, carbs: 31, fat: 5, fiber: 9 },
  { name: "Chana Masala / Chickpeas (1 cup)", calories: 220, protein: 10.5, carbs: 32, fat: 6, fiber: 8.5 },
  { name: "Chana Dal Fry (1 cup, 200g)", calories: 185, protein: 10.5, carbs: 26, fat: 4.8, fiber: 7 },
  { name: "Sprouted Moong Salad (1 bowl)", calories: 140, protein: 9, carbs: 22, fat: 1.5, fiber: 6 },
  { name: "Boiled Kala Chana Chaat (1 bowl, 150g)", calories: 180, protein: 9.5, carbs: 28, fat: 2.8, fiber: 7.5 },

  // Paneer, Soya & Vegetarian Proteins
  { name: "Raw Paneer (100g)", calories: 296, protein: 18.3, carbs: 4.5, fat: 22, fiber: 0 },
  { name: "Paneer Tikka (Grilled, 6 pcs)", calories: 240, protein: 16, carbs: 6, fat: 16, fiber: 1.5 },
  { name: "Paneer Bhurji (150g)", calories: 230, protein: 16, carbs: 5, fat: 16, fiber: 1.5 },
  { name: "Palak Paneer (1 bowl, 200g)", calories: 260, protein: 14, carbs: 9, fat: 18, fiber: 4.5 },
  { name: "Soya Chunks Curry (High Protein, 1 bowl)", calories: 190, protein: 21, carbs: 12, fat: 6, fiber: 6 },
  { name: "Sattu Drink (2 tbsp Chana sattu in water)", calories: 120, protein: 7.2, carbs: 18, fat: 1.8, fiber: 4 },
  { name: "Plain Curd / Dahi (1 cup, 150g)", calories: 98, protein: 5.5, carbs: 7, fat: 5.2, fiber: 0 },
  { name: "Masala Chaas / Buttermilk (1 glass, 250ml)", calories: 45, protein: 2.2, carbs: 3.5, fat: 2.2, fiber: 0 },
  { name: "Sweet Lassi (1 glass, 250ml)", calories: 210, protein: 6, carbs: 28, fat: 8, fiber: 0 },

  // Eggs, Chicken & Non-Veg Proteins
  { name: "Boiled Eggs (2 whole)", calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0 },
  { name: "Egg Whites (4 boiled)", calories: 68, protein: 14, carbs: 0.8, fat: 0.2, fiber: 0 },
  { name: "Egg Bhurji (2 eggs + onions/tomatoes)", calories: 180, protein: 14, carbs: 3, fat: 12, fiber: 1 },
  { name: "Egg Curry (2 boiled eggs with gravy)", calories: 220, protein: 15, carbs: 8, fat: 14, fiber: 1.8 },
  { name: "Tandoori Chicken Tikka (6 pcs, 150g)", calories: 240, protein: 32, carbs: 4, fat: 10, fiber: 1 },
  { name: "Grilled Chicken Breast (150g)", calories: 248, protein: 46, carbs: 0, fat: 5.4, fiber: 0 },
  { name: "Chicken Sukka / Pepper Chicken (150g)", calories: 250, protein: 34, carbs: 5, fat: 10, fiber: 1.2 },
  { name: "Chicken Biryani (1 plate, 300g)", calories: 490, protein: 28, carbs: 54, fat: 18, fiber: 3 },
  { name: "Butter Chicken / Murgh Makhani (1 cup)", calories: 360, protein: 24, carbs: 10, fat: 25, fiber: 1.5 },
  { name: "Indian Fish Curry (1 piece with gravy)", calories: 210, protein: 22, carbs: 5, fat: 11, fiber: 1 },
  { name: "Mutton Curry (1 bowl, 200g)", calories: 340, protein: 26, carbs: 6, fat: 24, fiber: 1 },

  // Healthy Snacks & Fitness Staples
  { name: "Roasted Makhana / Foxnuts (30g bowl)", calories: 105, protein: 3, carbs: 20, fat: 0.5, fiber: 2.5 },
  { name: "Roasted Chana / Bengal Gram (50g)", calories: 185, protein: 11, carbs: 29, fat: 2.5, fiber: 8 },
  { name: "Peanut Butter Multigrain Toast (1 slice)", calories: 190, protein: 8, carbs: 18, fat: 10, fiber: 3 },
  { name: "Almonds (handful, 28g)", calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5 },
  { name: "Whey Protein Shake in Water (1 scoop)", calories: 120, protein: 24, carbs: 2, fat: 1.5, fiber: 0 },
  { name: "Cow Milk (Toned, 1 glass 250ml)", calories: 150, protein: 8, carbs: 12, fat: 7.5, fiber: 0 },
  { name: "Banana (1 medium)", calories: 105, protein: 1.3, carbs: 27, fat: 0.3, fiber: 3.1 },
  { name: "Apple (1 medium)", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4 }
];

const SMART_SWAP_DATABASE = [
  {
    id: "pizza",
    category: "fastfood",
    categoryLabel: "Fast Food",
    emoji: "🍕",
    title: "Pizza Night Upgrade",
    craving: {
      name: "3 Slices Pepperoni / Cheese Pizza",
      portion: "3 large slices (~330g)",
      calories: 870,
      protein: 28,
      carbs: 96,
      fat: 42,
      flaw: "Refined maida crust soaked in melted cheese grease & processed sodium"
    },
    swap: {
      name: "Crispy Tortilla Pizza + 100g Paneer/Chicken Tikka",
      portion: "1 whole pizza + grilled tikka topping",
      calories: 480,
      protein: 44,
      carbs: 35,
      fat: 14,
      fiber: 6,
      win: "100% cheesy pizza satisfaction with half the carbs and double the muscle protein",
      recipeTip: "Air-fry a crisp whole-wheat tortilla with 1 tbsp marinara, 35g low-fat mozzarella, and spiced chicken or paneer tikka."
    },
    savings: {
      calories: 390,
      proteinGain: 16,
      fatSaved: 28,
      carbCut: 61
    },
    keywords: ["pizza", "dominos", "slice", "crust", "cheese burst", "pepperoni"]
  },
  {
    id: "biryani",
    category: "meals",
    categoryLabel: "Rice & Curries",
    emoji: "🍛",
    title: "Dum Biryani Feast Upgrade",
    craving: {
      name: "Large Plate Dum Biryani with Salan",
      portion: "1 restaurant container (~450g)",
      calories: 740,
      protein: 22,
      carbs: 88,
      fat: 34,
      flaw: "Heavy ghee and deep-fried onion layers with high hidden cooking oil"
    },
    swap: {
      name: "High-Protein Soya Chunks & Egg Biryani + Mint Raita",
      portion: "1 large satisfying bowl + cooling dip",
      calories: 390,
      protein: 36,
      carbs: 48,
      fat: 7,
      fiber: 8,
      win: "36g complete protein from soya & egg whites with light aromatic basmati",
      recipeTip: "Boil 50g soya chunks + 2 egg whites, toss with biryani spices, light steamed rice, and a bowl of chilled cucumber curd."
    },
    savings: {
      calories: 350,
      proteinGain: 14,
      fatSaved: 27,
      carbCut: 40
    },
    keywords: ["biryani", "pulao", "fried rice", "dum biryani", "rice", "salan"]
  },
  {
    id: "burger",
    category: "fastfood",
    categoryLabel: "Fast Food",
    emoji: "🍔",
    title: "Loaded Burger & Fries Upgrade",
    craving: {
      name: "Double Cheese Burger + Regular French Fries",
      portion: "1 large burger + medium fries",
      calories: 920,
      protein: 24,
      carbs: 92,
      fat: 50,
      flaw: "Deep-fryer grease, sugary ketchup, and processed melted cheese slices"
    },
    swap: {
      name: "Grilled Tikka Burger on Whole Wheat Bun + Air-Fried Wedges",
      portion: "1 hearty burger + crispy potato wedges",
      calories: 430,
      protein: 38,
      carbs: 44,
      fat: 12,
      fiber: 7,
      win: "Zero deep-fryer oil, satisfying crunch, and +14g extra protein power",
      recipeTip: "Toast a whole-wheat bun, use a thick grilled chicken breast or paneer slab, crunchy lettuce, and hung-curd mint mayo."
    },
    savings: {
      calories: 490,
      proteinGain: 14,
      fatSaved: 38,
      carbCut: 48
    },
    keywords: ["burger", "cheeseburger", "mcdonalds", "fries", "french fries", "patty"]
  },
  {
    id: "samosa",
    category: "snacks",
    categoryLabel: "Street Snacks",
    emoji: "🥟",
    title: "Crispy Samosa Tea-Time Upgrade",
    craving: {
      name: "2 Deep-Fried Potato Samosas + Sweet Chutney",
      portion: "2 medium samosas + dip",
      calories: 540,
      protein: 7,
      carbs: 64,
      fat: 30,
      flaw: "Deep-fried in reused commercial oil with high-glycemic sugar tamarind syrup"
    },
    swap: {
      name: "Spiced Roasted Makhana + Boiled Kala Chana Chaat",
      portion: "1 huge crunchy bowl",
      calories: 240,
      protein: 15,
      carbs: 40,
      fat: 3,
      fiber: 9,
      win: "Crunchy antioxidant foxnuts and fiber-packed chickpeas with zero oil guilt",
      recipeTip: "Dry roast 30g lotus seeds (makhana) in a pinch of salt & chaat masala, then mix with 50g boiled black chickpeas, onions, and lemon."
    },
    savings: {
      calories: 300,
      proteinGain: 8,
      fatSaved: 27,
      carbCut: 24
    },
    keywords: ["samosa", "kachori", "pakora", "namkeen", "bhujia", "fried", "chips"]
  },
  {
    id: "naan",
    category: "breads",
    categoryLabel: "Roti & Breads",
    emoji: "🫓",
    title: "Restaurant Naan & Paratha Upgrade",
    craving: {
      name: "2 Butter Naan / Laccha Parathas",
      portion: "2 large restaurant breads",
      calories: 640,
      protein: 12,
      carbs: 84,
      fat: 28,
      flaw: "Refined white maida dough brushed with melted butter and margarine"
    },
    swap: {
      name: "2 Multigrain Phulkas / Rotis with 1/2 tsp Desi Ghee",
      portion: "2 hot whole-grain flatbreads",
      calories: 240,
      protein: 8,
      carbs: 44,
      fat: 4,
      fiber: 7,
      win: "Slow-digesting complex carbs with 3x higher fiber and healthy fat balance",
      recipeTip: "Order plain tandoori roti or make multigrain rotis at home, brush lightly with half-teaspoon pure A2 cow ghee."
    },
    savings: {
      calories: 400,
      proteinGain: -4,
      fatSaved: 24,
      carbCut: 40
    },
    keywords: ["naan", "butter naan", "paratha", "laccha", "kulcha", "rumali", "bhatura"]
  },
  {
    id: "momos",
    category: "snacks",
    categoryLabel: "Street Snacks",
    emoji: "🥟",
    title: "Street Momos & Dip Upgrade",
    craving: {
      name: "1 Plate Deep-Fried Momos with Garlic Mayo",
      portion: "6 fried momos + heavy mayo dip",
      calories: 580,
      protein: 12,
      carbs: 54,
      fat: 34,
      flaw: "Deep-fried dough shell dipped in industrial soybean oil mayonnaise"
    },
    swap: {
      name: "Steamed Chicken/Soya Momos with Fiery Tomato Chutney",
      portion: "6-8 juicy steamed dumplings",
      calories: 230,
      protein: 22,
      carbs: 30,
      fat: 3,
      fiber: 4,
      win: "Cuts 31g of junk oil while keeping the juicy, spicy street flavor intact",
      recipeTip: "Order steamed wheat momos and ask for extra fiery red chilli-tomato garlic chutney instead of mayo."
    },
    savings: {
      calories: 350,
      proteinGain: 10,
      fatSaved: 31,
      carbCut: 24
    },
    keywords: ["momo", "momos", "dimsum", "dumpling", "fried momo", "mayo"]
  },
  {
    id: "chole-bhature",
    category: "meals",
    categoryLabel: "Rice & Curries",
    emoji: "🥘",
    title: "Sunday Chole Bhature Upgrade",
    craving: {
      name: "2 Puffed Fried Bhaturas with Rich Chole",
      portion: "2 large bhaturas + oily chickpea gravy",
      calories: 840,
      protein: 18,
      carbs: 92,
      fat: 42,
      flaw: "Maida dough acts like an oil sponge when deep-fried in boiling oil"
    },
    swap: {
      name: "2 Tandoori Rotis + Amritsari Chana Curry + 100g Fresh Curd",
      portion: "2 crisp tandoori rotis + protein bowl",
      calories: 420,
      protein: 26,
      carbs: 60,
      fat: 8,
      fiber: 10,
      win: "Authentic Punjabi spiced chana flavor with zero oil bloat and 26g protein",
      recipeTip: "Pair spiced chickpea curry with oil-free clay oven tandoori roti and a cup of protein-rich fresh curd."
    },
    savings: {
      calories: 420,
      proteinGain: 8,
      fatSaved: 34,
      carbCut: 32
    },
    keywords: ["bhature", "chole bhature", "poori", "puri", "chana bhatura", "halwa poori"]
  },
  {
    id: "paneer-gravy",
    category: "meals",
    categoryLabel: "Rice & Curries",
    emoji: "🧀",
    title: "Creamy Butter Masala Upgrade",
    craving: {
      name: "Paneer Butter Masala / Butter Chicken (Full Cream)",
      portion: "1 restaurant bowl (~300g)",
      calories: 520,
      protein: 16,
      carbs: 20,
      fat: 42,
      flaw: "Cooked in cashew nut paste, heavy dairy cream, and floating butter"
    },
    swap: {
      name: "Tandoori Paneer / Chicken Tikka Masala in Tomato Onion Tadka",
      portion: "1 hearty aromatic bowl",
      calories: 260,
      protein: 26,
      carbs: 12,
      fat: 10,
      fiber: 4,
      win: "Charred smoky tandoori cubes in zesty tomato cumin gravy without heavy cream",
      recipeTip: "Simmer pre-grilled tikka cubes in a fresh onion-tomato-ginger gravy; finish with kasuri methi instead of cream."
    },
    savings: {
      calories: 260,
      proteinGain: 10,
      fatSaved: 32,
      carbCut: 8
    },
    keywords: ["butter masala", "malai", "shahi paneer", "korma", "butter chicken", "creamy gravy"]
  },
  {
    id: "chai",
    category: "drinks",
    categoryLabel: "Beverages",
    emoji: "☕",
    title: "Daily Sweet Chai Upgrade",
    craving: {
      name: "2 Large Cups Full-Cream Sweet Chai",
      portion: "2 glasses (500ml total)",
      calories: 280,
      protein: 6,
      carbs: 38,
      fat: 12,
      flaw: "Contains 4-5 tsp refined white sugar spike and heavy buffalo dairy fat"
    },
    swap: {
      name: "Elaichi Ginger Chai with Toned Milk (Stevia) or Spiced Chaas",
      portion: "2 fragrant cups or 1 chilled glass",
      calories: 70,
      protein: 5,
      carbs: 7,
      fat: 2,
      fiber: 0,
      win: "100% comforting Indian chai spices and antioxidants with zero sugar crash",
      recipeTip: "Boil ginger, cardamom, and clove in water, add toned milk, and sweeten with natural zero-calorie stevia."
    },
    savings: {
      calories: 210,
      proteinGain: -1,
      fatSaved: 10,
      carbCut: 31
    },
    keywords: ["chai", "tea", "coffee", "latte", "lassi", "coke", "soda", "pepsi", "drink", "cold coffee"]
  },
  {
    id: "sweets",
    category: "sweets",
    categoryLabel: "Desserts",
    emoji: "🍨",
    title: "Late-Night Sweet Craving Upgrade",
    craving: {
      name: "2 Fried Gulab Jamun or 3 Jalebis",
      portion: "2 pieces (~120g)",
      calories: 420,
      protein: 4,
      carbs: 68,
      fat: 16,
      flaw: "Fried mawa dough soaked in thick refined sugar syrup with near-zero protein"
    },
    swap: {
      name: "High-Protein Hung Curd Shrikhand with Saffron & Almonds",
      portion: "1 rich chilled dessert cup",
      calories: 150,
      protein: 18,
      carbs: 12,
      fat: 3,
      fiber: 2,
      win: "Velvety royal Indian dessert loaded with 18g muscle-fueling protein",
      recipeTip: "Whisk thick hung curd or Greek yogurt with elaichi, saffron strands, stevia, and slivered almonds; chill for 30 mins."
    },
    savings: {
      calories: 270,
      proteinGain: 14,
      fatSaved: 13,
      carbCut: 56
    },
    keywords: ["gulab jamun", "jalebi", "rasgulla", "sweet", "ice cream", "cake", "halwa", "pastry", "dessert", "mithai"]
  }
];

const SWAPS = SMART_SWAP_DATABASE.map(s => ({
  from: s.craving.name,
  to: s.swap.name,
  note: s.swap.note
}));

const MACRO_HISTORY_STORAGE_KEY = "jazz_macro_history_real_v4";

// Thoroughly wipe all legacy mock and cache entries from browser localStorage
try {
  localStorage.removeItem("jazz_macro_history_real_v3");
  localStorage.removeItem("jazz_macro_history_v2");
  localStorage.removeItem("jazz_macro_history_v1");
  localStorage.removeItem("jazz_macro_history");
  localStorage.removeItem("jazz_macro_mock");
  localStorage.removeItem("nutripulse_mock");
  localStorage.removeItem("nutripulse_history");
} catch (e) {}

function getStoredMacroHistory() {
  try {
    const raw = localStorage.getItem(MACRO_HISTORY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {}
  return {};
}

function genRealHistory(meals = [], activities = [], water = 0, dbHistory = {}) {
  const days = [];
  const today = new Date();
  // Purely database history combined with today's live state — ZERO mock numbers
  const historyMap = { ...(dbHistory || {}) };
  
  const todayEaten = (meals || []).reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  const todayBurned = (activities || []).reduce((sum, a) => sum + (Number(a.calories) || 0), 0);
  const todayProtein = (meals || []).reduce((sum, m) => sum + (Number(m.protein) || 0), 0);
  const todayCarbs = (meals || []).reduce((sum, m) => sum + (Number(m.carbs) || 0), 0);
  const todayFat = (meals || []).reduce((sum, m) => sum + (Number(m.fat) || 0), 0);

  const todayKey = today.toISOString().split("T")[0];
  historyMap[todayKey] = {
    calories: todayEaten,
    burn: todayBurned,
    protein: Math.round(todayProtein),
    carbs: Math.round(todayCarbs),
    fat: Math.round(todayFat),
    water: Number(water) || 0,
    net: todayEaten - todayBurned
  };

  try {
    localStorage.setItem(MACRO_HISTORY_STORAGE_KEY, JSON.stringify(historyMap));
  } catch (e) {}

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split("T")[0];
    const isToday = i === 0;
    const archived = historyMap[dateKey];

    const cals = isToday ? todayEaten : (Number(archived?.calories) || 0);
    const brn = isToday ? todayBurned : (Number(archived?.burn) || 0);
    const prot = isToday ? Math.round(todayProtein) : (Number(archived?.protein) || 0);
    const crb = isToday ? Math.round(todayCarbs) : (Number(archived?.carbs) || 0);
    const ft = isToday ? Math.round(todayFat) : (Number(archived?.fat) || 0);
    const wtr = isToday ? (Number(water) || 0) : (Number(archived?.water) || 0);

    days.push({
      date: dateKey,
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      short: d.toLocaleDateString(undefined, { weekday: "short" }),
      calories: cals,
      burn: brn,
      protein: prot,
      carbs: crb,
      fat: ft,
      water: wtr,
      net: cals - brn,
    });
  }
  return days;
}

/* ---------------------------------------------------------------------- */
/* HELPERS                                                                 */
/* ---------------------------------------------------------------------- */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const pct = (v, g) => clamp(Math.round((v / g) * 100), 0, 999);

function Ring({ size = 128, stroke = 12, value, max, color, track = "#EDEAE0", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = clamp(value / max, 0, 1);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - frac)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .5s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}

function MiniMacro({ label, value, goal, color }) {
  const isGoalReached = value >= goal;
  return (
    <div className="np-mini-macro">
      <div className="np-mini-macro-top">
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {label}
          {isGoalReached && <span style={{ fontSize: 10, color: "#16A34A", fontWeight: 800 }}>★</span>}
        </span>
        <span style={{ color, fontWeight: isGoalReached ? 800 : 600 }}>{value}g</span>
      </div>
      <div className="np-mini-bar-track">
        <div
          className="np-mini-bar-fill"
          style={{
            width: `${Math.min(100, pct(value, goal))}%`,
            background: isGoalReached ? "linear-gradient(90deg, #16A34A, #22C55E)" : color,
            boxShadow: isGoalReached ? "0 0 8px rgba(34,197,94,0.45)" : "none"
          }}
        />
      </div>
    </div>
  );
}

function Switch({ on, onClick, color = "var(--brand)" }) {
  return (
    <div className="np-switch" onClick={onClick} style={{ background: on ? color : "#D8D4C6" }}>
      <div className="knob" style={{ left: on ? 18 : 2 }} />
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* MAIN APP                                                                */
/* ---------------------------------------------------------------------- */
export default function JazzMacrosApp() {
  const [tab, setTab] = useState("dashboard");
  const [scanSubtab, setScanSubtab] = useState("scan");
  const [showQuickDock, setShowQuickDock] = useState(false);
  const [showHabitPill, setShowHabitPill] = useState(false);
  const [showHabitTrackerModal, setShowHabitTrackerModal] = useState(false);

  // Persistent habits state (keyed by today's date so each day is clean & remembered)
  const [habits, setHabits] = useState(() => {
    try {
      const todayKey = new Date().toISOString().split("T")[0];
      const saved = localStorage.getItem(`jazz_habits_${todayKey}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { water: false, protein: false, meals: false, activity: false, sugar: false, sleep: false };
  });

  // Persistent meals, activities, water, goals, and favorites (0ms flash-free reload)
  const [meals, setMeals] = useState(() => {
    try {
      const saved = localStorage.getItem("jazz_meals_cache_v1");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [activities, setActivities] = useState(() => {
    try {
      const saved = localStorage.getItem("jazz_activities_cache_v1");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [water, setWater] = useState(() => {
    try {
      const saved = localStorage.getItem("jazz_water_cache_v1");
      return saved ? Number(saved) : 0;
    } catch (e) { return 0; }
  });
  const [reminder, setReminder] = useState(() => {
    try {
      const saved = localStorage.getItem("jazz_reminder_cache_v1");
      return saved ? JSON.parse(saved) : { enabled: true, interval: 90, start: "08:00", end: "21:00" };
    } catch (e) { return { enabled: true, interval: 90, start: "08:00", end: "21:00" }; }
  });
  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem("jazz_goals_cache_v1");
      return saved ? { ...DEFAULT_GOALS, ...JSON.parse(saved) } : DEFAULT_GOALS;
    } catch (e) { return DEFAULT_GOALS; }
  });
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("jazz_favorites_cache_v1");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [showReminderEdit, setShowReminderEdit] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [dbHistory, setDbHistory] = useState({});
  const history = useMemo(() => genRealHistory(meals, activities, water, dbHistory), [meals, activities, water, dbHistory]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [syncStatus, setSyncStatus] = useState("synced");
  const [showIntro, setShowIntro] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setSyncStatus("syncing");
      const [dbMeals, dbActivities, dbStats, dbGoals, dbFavs, dbPast] = await Promise.all([
        fetchMeals(),
        fetchActivities(),
        fetchDailyStats(),
        fetchUserGoals(),
        fetchFavorites(),
        fetchPastHistoryFromDb(),
      ]);

      if (Array.isArray(dbMeals)) {
        setMeals(dbMeals);
        try { localStorage.setItem("jazz_meals_cache_v1", JSON.stringify(dbMeals)); } catch (e) {}
      }
      if (Array.isArray(dbActivities)) {
        setActivities(dbActivities);
        try { localStorage.setItem("jazz_activities_cache_v1", JSON.stringify(dbActivities)); } catch (e) {}
      }
      if (dbStats && typeof dbStats.water === "number") {
        setWater(dbStats.water);
        try { localStorage.setItem("jazz_water_cache_v1", String(dbStats.water)); } catch (e) {}
      }
      if (dbPast && typeof dbPast === "object") {
        setDbHistory(dbPast);
      }

      setReminder((prev) => {
        const updated = {
          ...prev,
          enabled: dbStats.reminderEnabled,
          interval: dbStats.reminderInterval,
        };
        try { localStorage.setItem("jazz_reminder_cache_v1", JSON.stringify(updated)); } catch (e) {}
        return updated;
      });

      if (dbGoals) {
        setGoals((prev) => {
          const updated = {
            ...prev,
            ...dbGoals,
            water: dbGoals.water > 50 ? dbGoals.water : 2500,
          };
          try { localStorage.setItem("jazz_goals_cache_v1", JSON.stringify(updated)); } catch (e) {}
          return updated;
        });
      }

      if (dbFavs && dbFavs.length > 0) {
        setFavorites(dbFavs);
        try { localStorage.setItem("jazz_favorites_cache_v1", JSON.stringify(dbFavs)); } catch (e) {}
      }

      setSyncStatus("synced");
    } catch (err) {
      console.error("Failed to load data from Neon DB:", err);
      setSyncStatus("error");
    } finally {
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Android hardware back button ─────────────────────────────────────────
  useEffect(() => {
    let listenerHandle = null;
    const register = async () => {
      listenerHandle = await CapApp.addListener("backButton", () => {
        // 1. Close any open overlays/modals first
        if (showQuickDock) { setShowQuickDock(false); return; }
        if (showQuickAdd)  { setShowQuickAdd(false);  return; }
        if (showGoalsModal){ setShowGoalsModal(false); return; }
        if (showReminderEdit){ setShowReminderEdit(false); return; }

        // 2. Navigate back through view hierarchy
        if (tab === "chat")   { setTab("ai");        return; }
        if (tab === "habits") { setTab("dashboard"); return; }
        if (tab !== "dashboard") { setTab("dashboard"); return; }

        // 3. Already on dashboard — exit the app
        CapApp.exitApp();
      });
    };
    register();
    return () => { if (listenerHandle) listenerHandle.remove(); };
  }, [tab, showQuickDock, showQuickAdd, showGoalsModal, showReminderEdit]);


  const totals = useMemo(() => meals.reduce((a, m) => ({
    calories: a.calories + m.calories, protein: a.protein + m.protein,
    carbs: a.carbs + m.carbs, fat: a.fat + m.fat, fiber: a.fiber + m.fiber,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }), [meals]);

  const burned = useMemo(() => activities.reduce((a, x) => a + x.calories, 0), [activities]);
  const net = totals.calories - burned;
  const remaining = {
    calories: Math.max(0, goals.calories - net),
    protein: Math.max(0, goals.protein - totals.protein),
    carbs: Math.max(0, goals.carbs - totals.carbs),
    fat: Math.max(0, goals.fat - totals.fat),
  };

  const handleSaveGoals = useCallback(async (newGoals) => {
    setGoals(newGoals);
    setShowGoalsModal(false);
    setSyncStatus("syncing");
    try {
      await saveUserGoals(newGoals);
      setSyncStatus("synced");
    } catch (err) {
      console.error("Failed to save goals to Neon:", err);
      setSyncStatus("error");
    }
  }, []);

  const toggleFavorite = useCallback(async (meal) => {
    const cleanName = meal.name.trim().toLowerCase();
    const existing = favorites.find((f) => f.name.trim().toLowerCase() === cleanName);
    if (existing) {
      setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
      try {
        await removeFavorite(existing.id);
      } catch (err) {
        console.error("Failed to remove favorite:", err);
      }
    } else {
      try {
        const added = await insertFavorite({
          name: meal.name,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          fiber: meal.fiber,
        });
        setFavorites((prev) => [added, ...prev]);
      } catch (err) {
        console.error("Failed to insert favorite:", err);
      }
    }
  }, [favorites]);

  const addMeal = useCallback(async (m) => {
    const tempId = Date.now();
    const time = m.time || nowLabel();
    const optimisticMeal = { ...m, id: tempId, time };
    setMeals((prev) => [...prev, optimisticMeal]);
    setSyncStatus("syncing");
    try {
      const saved = await insertMeal(optimisticMeal);
      setMeals((prev) => prev.map((item) => (item.id === tempId ? saved : item)));
      setSyncStatus("synced");
    } catch (err) {
      console.error("Failed to save meal to Neon:", err);
      setSyncStatus("error");
    }
  }, []);

  const removeMeal = useCallback(async (id) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
    setSyncStatus("syncing");
    try {
      await removeMealFromDb(id);
      setSyncStatus("synced");
    } catch (err) {
      console.error("Failed to remove meal from Neon:", err);
      setSyncStatus("error");
    }
  }, []);

  const addActivity = useCallback(async (a) => {
    const tempId = Date.now();
    const time = a.time || nowLabel();
    const optimisticAct = { ...a, id: tempId, time };
    setActivities((prev) => [...prev, optimisticAct]);
    setSyncStatus("syncing");
    try {
      const saved = await insertActivity(optimisticAct);
      setActivities((prev) => prev.map((item) => (item.id === tempId ? saved : item)));
      setSyncStatus("synced");
    } catch (err) {
      console.error("Failed to save activity to Neon:", err);
      setSyncStatus("error");
    }
  }, []);

  const removeActivity = useCallback(async (id) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    setSyncStatus("syncing");
    try {
      await removeActivityFromDb(id);
      setSyncStatus("synced");
    } catch (err) {
      console.error("Failed to remove activity from Neon:", err);
      setSyncStatus("error");
    }
  }, []);

  const handleWaterChange = useCallback((valOrFn) => {
    setWater((prev) => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;
      saveWaterIntake(next).catch((err) => {
        console.error("Failed to save water to Neon:", err);
        setSyncStatus("error");
      });
      return next;
    });
  }, []);

  const handleReminderChange = useCallback((valOrFn) => {
    setReminder((prev) => {
      const next = typeof valOrFn === "function" ? valOrFn(prev) : valOrFn;

      if (next.enabled) {
        requestNotificationPermission().then((granted) => {
          if (granted && !prev.enabled) {
            showNotification(
              "💧 Water Reminders ON!",
              `You're set! JazzMacros will ping you every ${next.interval} min to sip water between ${next.start}–${next.end}. Stay locked in! 🔥`
            );
          }
          // Schedule native alarms
          scheduleHydrationReminders(true, next.interval, next.start, next.end);
        });
      } else {
        scheduleHydrationReminders(false);
      }

      saveReminderSettings(next).catch((err) => {
        console.error("Failed to save reminder to Neon:", err);
        setSyncStatus("error");
      });
      return next;
    });
  }, []);

  // Real-time foreground + native notification scheduling
  useEffect(() => {
    if (!reminder.enabled) {
      scheduleHydrationReminders(false);
      return;
    }

    // Schedule native background notifications on Android
    scheduleHydrationReminders(true, reminder.interval, reminder.start, reminder.end);

    // Rotating water reminder messages so they never feel repetitive
    const WATER_MSGS = [
      { title: "💧 Drink water bro!",        body: "You haven't sipped in a while. 250ml right now — muscles stay full, metabolism stays lit. 🔥" },
      { title: "🚰 Hydration check!",         body: "Your body is ~60% water and it's drying up. Grab a glass and top it off. Don't skip this one!" },
      { title: "💧 Water time!",              body: "Even mild dehydration tanks your focus and energy. One glass now, thank yourself later. 💪" },
      { title: "🥤 Sip sip go!",             body: "Protein hits harder when you're hydrated. Drink 250ml — keep those macros working for you." },
      { title: "💧 Stay hydrated king!",      body: "Water = better digestion, clearer skin, more energy. One glass. Do it now, don't wait." },
      { title: "🌊 Hydration o'clock!",       body: "Fat metabolism slows when you're dry. Drink up and keep your body running at 100%." },
    ];
    let _msgIdx = 0;

    const intervalMs = Math.max(1, Number(reminder.interval) || 90) * 60 * 1000;
    const timer = setInterval(() => {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      const nowMin = currentH * 60 + currentM;

      const [startH, startM] = (reminder.start || "08:00").split(":").map(Number);
      const [endH, endM] = (reminder.end || "21:00").split(":").map(Number);
      const startTotal = startH * 60 + (startM || 0);
      const endTotal = endH * 60 + (endM || 0);

      if (nowMin >= startTotal && nowMin <= endTotal) {
        const msg = WATER_MSGS[_msgIdx % WATER_MSGS.length];
        _msgIdx++;
        showNotification(msg.title, msg.body);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [reminder.enabled, reminder.interval, reminder.start, reminder.end]);

  // Sync state to localStorage immediately so no data ever vanishes on refresh
  useEffect(() => {
    try { localStorage.setItem("jazz_meals_cache_v1", JSON.stringify(meals)); } catch (e) {}
  }, [meals]);

  useEffect(() => {
    try { localStorage.setItem("jazz_activities_cache_v1", JSON.stringify(activities)); } catch (e) {}
  }, [activities]);

  useEffect(() => {
    try { localStorage.setItem("jazz_water_cache_v1", String(water)); } catch (e) {}
  }, [water]);

  useEffect(() => {
    try { localStorage.setItem("jazz_goals_cache_v1", JSON.stringify(goals)); } catch (e) {}
  }, [goals]);

  useEffect(() => {
    try { localStorage.setItem("jazz_favorites_cache_v1", JSON.stringify(favorites)); } catch (e) {}
  }, [favorites]);

  useEffect(() => {
    try {
      const todayKey = new Date().toISOString().split("T")[0];
      localStorage.setItem(`jazz_habits_${todayKey}`, JSON.stringify(habits));
    } catch (e) {}
  }, [habits]);

  const toggleHabit = useCallback((key) => {
    setHabits((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        const todayKey = new Date().toISOString().split("T")[0];
        localStorage.setItem(`jazz_habits_${todayKey}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  return (
    <div className="np-root">
      <style>{CSS}</style>
      <div className="np-phone">
        {showIntro && <IntroScreen onFinish={() => setShowIntro(false)} />}
        {tab !== "habits" && tab !== "chat" && <TopBar streak={meals.length > 0 ? 1 : 0} onReplayIntro={() => setShowIntro(true)} />}
          <div className="np-scroll" style={{ display: (tab === "chat" || tab === "habits") ? "none" : "block" }}>
            {tab === "dashboard" && (
              <Dashboard
                totals={totals} burned={burned} net={net} remaining={remaining}
                goals={goals} onOpenGoals={() => setShowGoalsModal(true)}
                favorites={favorites} toggleFavorite={toggleFavorite} addMeal={addMeal}
                meals={meals} activities={activities} water={water} setWater={handleWaterChange}
                reminder={reminder} setReminder={handleReminderChange}
                showReminderEdit={showReminderEdit} setShowReminderEdit={setShowReminderEdit}
                removeMeal={removeMeal} removeActivity={removeActivity}
                addActivity={addActivity} setTab={setTab}
              />
            )}
            {tab === "scan" && (
              <ScanLog
                addMeal={addMeal}
                remaining={remaining}
                subtab={scanSubtab}
                setSubtab={setScanSubtab}
              />
            )}
            {tab === "ai" && <AISuggestions remaining={remaining} totals={totals} goals={goals} meals={meals} addMeal={addMeal} onOpenChat={() => setTab("chat")} />}
            {tab === "trends" && <Trends history={history} goals={goals} />}
          </div>
          {tab === "chat" && <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}><ChatView remaining={remaining} totals={totals} meals={meals} goals={goals} onBack={() => setTab("ai")} /></div>}
          {tab === "habits" && (
            <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0D0D0D", color: "#fff" }}>
              {/* Header */}
              <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#161616", borderBottom: "1px solid #222", position: "sticky", top: 0, zIndex: 10 }}>
                <button onClick={() => setTab("dashboard")}
                  style={{ background: "#256B58", color: "#fff", border: "none", borderRadius: 12, width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <Home size={20} />
                </button>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, letterSpacing: "-0.02em" }}>Habit Tracker</div>
                <span style={{ fontSize: 10, fontWeight: 700, background: "#F59E0B", color: "#000", padding: "4px 10px", borderRadius: 20 }}>WIP</span>
              </div>

              {/* Coming Soon Card */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", gap: 28, textAlign: "center" }}>
                {/* Badge preview row */}
                <div style={{ display: "flex", gap: -8 }}>
                  {[0,1,2,3,4].map(i => (
                    <div key={i} style={{
                      width: 52, height: 52, borderRadius: "50%", marginLeft: i > 0 ? -14 : 0,
                      backgroundImage: "url('/badge.png')",
                      backgroundSize: "100% 1000%",
                      backgroundPosition: `0% ${(i / 9) * 100}%`,
                      backgroundRepeat: "no-repeat",
                      border: "2.5px solid #0D0D0D",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
                    }} />
                  ))}
                  <div style={{ width: 52, height: 52, borderRadius: "50%", marginLeft: -14, background: "#222", border: "2.5px solid #0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#666", fontWeight: 700 }}>+5</div>
                </div>

                <div>
                  <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", marginBottom: 10 }}>Coming Soon 🚧</div>
                  <div style={{ fontSize: 14, color: "#666", lineHeight: 1.6, maxWidth: 280 }}>
                    Streak-based badge progression from <span style={{ color: "#fff", fontWeight: 700 }}>Clown → Giga Chad</span>.<br />
                    Track daily habits, earn ranks, flex the timer.
                  </div>
                </div>

                {/* Feature teaser chips */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {["🔥 Daily Streak Counter", "🏅 10 Meme Badges", "⏱ Live Timer", "📊 Progress Ring", "🔒 Unlock Ranks"].map(f => (
                    <span key={f} style={{ fontSize: 12, fontWeight: 600, background: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: 20, padding: "5px 12px", color: "#888" }}>{f}</span>
                  ))}
                </div>

                <button onClick={() => setTab("dashboard")}
                  style={{ marginTop: 8, padding: "13px 32px", borderRadius: 14, background: "#256B58", color: "#fff", border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 20px rgba(37,107,88,0.4)" }}>
                  <Home size={16} /> Back to Dashboard
                </button>
              </div>
            </div>
          )}


          {tab === "dashboard" && (
            <>
              {showQuickDock && (
                <div className="np-dock-backdrop" onClick={() => setShowQuickDock(false)}>
                  <div className="np-dock-menu" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="np-dock-btn"
                      onClick={() => {
                        setScanSubtab("scan");
                        setTab("scan");
                        setShowQuickDock(false);
                      }}
                    >
                      <div className="np-dock-ico" style={{ background: "var(--accent)" }}>
                        <Camera size={16} />
                      </div>
                      <span>Snap Meal Photo</span>
                    </button>

                    <button
                      className="np-dock-btn"
                      onClick={() => {
                        setScanSubtab("barcode");
                        setTab("scan");
                        setShowQuickDock(false);
                      }}
                    >
                      <div className="np-dock-ico" style={{ background: "var(--brand)" }}>
                        <Barcode size={16} />
                      </div>
                      <span>Scan Barcode / Label</span>
                    </button>

                    <button
                      className="np-dock-btn"
                      onClick={() => {
                        setScanSubtab("voice");
                        setTab("scan");
                        setShowQuickDock(false);
                      }}
                    >
                      <div className="np-dock-ico" style={{ background: "#EF4444" }}>
                        <Mic size={16} />
                      </div>
                      <span>Voice AI Log</span>
                    </button>

                    <button
                      className="np-dock-btn"
                      onClick={() => {
                        setShowQuickDock(false);
                        setShowQuickAdd(true);
                      }}
                    >
                      <div className="np-dock-ico" style={{ background: "var(--protein)" }}>
                        <Plus size={16} />
                      </div>
                      <span>Manual Add</span>
                    </button>
                  </div>
                </div>
              )}




              <button
                className="np-fab"
                onClick={() => setShowQuickDock(!showQuickDock)}
                aria-label="Quick action menu"
                style={{
                  transform: showQuickDock ? "rotate(45deg)" : "none",
                  transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  zIndex: 16
                }}
              >
                <Plus size={24} />
              </button>
            </>
          )}
          {tab !== "chat" && tab !== "habits" && (
            <TabBar tab={tab} setTab={setTab} />
          )}

          {showQuickAdd && (
            <QuickAddModal
              favorites={favorites}
              onClose={() => setShowQuickAdd(false)}
              onAddMeal={(m) => { addMeal(m); setShowQuickAdd(false); }}
              onAddActivity={(a) => { addActivity(a); setShowQuickAdd(false); }}
            />
          )}

          {showGoalsModal && (
            <GoalsModal
              goals={goals}
              onClose={() => setShowGoalsModal(false)}
              onSave={handleSaveGoals}
            />
          )}

          {showHabitTrackerModal && (
            <HabitTrackerModal
              habits={habits}
              onToggle={toggleHabit}
              water={water}
              goals={goals}
              totals={totals}
              meals={meals}
              activities={activities}
              onClose={() => setShowHabitTrackerModal(false)}
            />
          )}
        </div>
      </div>
  );
}

function nowLabel() {
  return new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function TopBar({ streak = 0, onReplayIntro }) {
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  return (
    <div className="np-topbar">
      <div onClick={onReplayIntro} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }} title="Click to replay intro">
        <img src="/logo.png" alt="JazzMacros" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain" }} />
        <div>
          <div className="np-word" style={{ fontSize: 17 }}>JazzMacros</div>
          <div className="np-date">{today}</div>
        </div>
      </div>
      <div className="np-streak"><Flame size={13} /> {streak} day streak</div>
    </div>
  );
}

function TabBar({ tab, setTab }) {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "scan", label: "Scan & Log", icon: Camera },
    { id: "ai", label: "JazzCoach", icon: Sparkles },
    { id: "trends", label: "Monthly Trends", icon: TrendingUp },
  ];
  return (
    <div className="np-tabbar">
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.id || (tab === "chat" && it.id === "ai");
        return (
          <button key={it.id} className={`np-tab ${active ? "active" : ""}`} onClick={() => setTab(it.id)}>
            <span className="ico-wrap"><Icon size={19} /></span>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* DASHBOARD                                                               */
/* ---------------------------------------------------------------------- */
function Dashboard({
  totals, burned, net, remaining, goals, onOpenGoals,
  favorites = [], toggleFavorite, addMeal,
  meals, activities, water, setWater, reminder, setReminder,
  showReminderEdit, setShowReminderEdit, removeMeal, removeActivity, addActivity, setTab
}) {
  const calPct = pct(net, goals.calories);
  const combinedLog = [
    ...meals.map((m) => ({ ...m, kind: "meal" })),
    ...activities.map((a) => ({ ...a, kind: "activity" })),
  ].sort((a, b) => (a.time > b.time ? 1 : -1));

  return (
    <>
      <div className="np-h1" style={{ marginTop: 16 }}>Today's summary</div>
      <div className="np-sub">Net calories, macros, and hydration at a glance</div>

      <div className="np-card">
        <div className="np-ring-row">
          <Ring value={net} max={goals.calories} color={net > goals.calories ? "var(--danger)" : "var(--accent)"}>
            <div className="np-ring-stat">{net}</div>
            <div
              className="np-ring-label"
              onClick={onOpenGoals}
              style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 3, color: "var(--accent)", fontWeight: 600 }}
              title="Click to edit goals"
            >
              of {goals.calories} kcal <Pencil size={11} />
            </div>
          </Ring>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: "var(--ink-soft)" }}>Eaten</span>
              <span style={{ fontWeight: 700 }}>{totals.calories} kcal</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: "var(--ink-soft)" }}>Burned</span>
              <span style={{ fontWeight: 700, color: "var(--fat)" }}>&minus;{burned} kcal</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 8 }}>
              <span style={{ color: "var(--ink-soft)" }}>Remaining</span>
              <span style={{ fontWeight: 700, color: "var(--accent)" }}>{remaining.calories} kcal</span>
            </div>
            <button
              className="np-chip"
              onClick={onOpenGoals}
              style={{ padding: "4px 10px", fontSize: 11, border: "1px solid var(--accent)", color: "var(--accent)" }}
            >
              <Pencil size={11} /> Set Goals
            </button>
          </div>
        </div>
        <div className="np-mini-macros">
          <MiniMacro label="Protein" value={totals.protein} goal={goals.protein} color="var(--protein)" />
          <MiniMacro label="Carbs" value={totals.carbs} goal={goals.carbs} color="var(--carbs)" />
          <MiniMacro label="Fat" value={totals.fat} goal={goals.fat} color="var(--fat)" />
        </div>
      </div>

      {favorites.length > 0 && (
        <div className="np-card" style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
              <Star size={13} color="#E8A23D" fill="#E8A23D" /> Quick Favorites
            </div>
            <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>Tap to re-log today</span>
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {favorites.map((fav) => (
              <button
                key={fav.id}
                className="np-sample"
                style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1px solid var(--line)" }}
                onClick={() => addMeal({
                  name: fav.name,
                  calories: fav.calories,
                  protein: fav.protein,
                  carbs: fav.carbs,
                  fat: fav.fat,
                  fiber: fav.fiber,
                })}
              >
                <Plus size={13} color="var(--accent)" />
                <span>{fav.name}</span>
                <span style={{ color: "var(--ink-soft)", fontSize: 10.5 }}>({fav.calories} kcal)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="nf-panel">
        <div className="nf-title">Nutrition Facts</div>
        <div className="nf-serving">Serving size: Today's Log &middot; {meals.length} item{meals.length !== 1 ? "s" : ""}</div>
        <div className="nf-cal-row">
          <span className="nf-cal-label">Calories</span>
          <div>
            <div className="nf-cal-value" style={{ textAlign: "right" }}>{totals.calories}</div>
            <div className="nf-net">net {net} kcal ({calPct}% of goal)</div>
          </div>
        </div>
        <NfRow color="var(--protein)" name="Protein" value={totals.protein} goal={goals.protein} />
        <NfRow color="var(--carbs)" name="Carbs" value={totals.carbs} goal={goals.carbs} />
        <NfRow color="var(--fat)" name="Fat" value={totals.fat} goal={goals.fat} />
        <NfRow color="var(--fiber)" name="Fiber" value={totals.fiber} goal={goals.fiber} />
      </div>

      <div className="np-water-card">
        <div className="np-water-top">
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#12727D", display: "flex", alignItems: "center", gap: 5 }}>
              <Droplet size={13} /> HYDRATION
            </div>
            <div className="np-water-qty">{(water / 1000).toFixed(2)} L <span style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 500 }}>/ {(goals.water / 1000).toFixed(1)} L</span></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="np-chip" onClick={() => setWater((w) => w + 250)}>+250ml</div>
            <div className="np-chip" onClick={() => setWater((w) => w + 500)}>+500ml</div>
          </div>
        </div>
        <div className="np-water-track"><div className="np-water-fill" style={{ width: `${pct(water, goals.water)}%` }} /></div>

        <div className="np-reminder-row">
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Bell size={13} />
            {reminder.enabled
              ? `Every ${reminder.interval} min &middot; ${reminder.start}–${reminder.end}`.replace("&middot;", "\u00B7")
              : "Reminders off"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setShowReminderEdit(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#12727D" }}>
              <Pencil size={14} />
            </button>
            <Switch on={reminder.enabled} onClick={() => setReminder((r) => ({ ...r, enabled: !r.enabled }))} color="var(--water)" />
          </div>
        </div>
      </div>

      <div className="np-row-btns" style={{ marginBottom: 16 }}>
        <button className="np-btn np-btn-accent" style={{ flex: 1 }} onClick={() => setTab("scan")}>
          <Camera size={16} /> Scan food
        </button>
        <LogActivityInline addActivity={addActivity} />
      </div>

      <div className="np-card">
        <div className="np-card-title">Today's log</div>
        {combinedLog.length === 0 && <div className="np-empty">Nothing logged yet — scan a meal or quick add to get started.</div>}
        {combinedLog.map((item) => {
          const isFav = item.kind === "meal" && favorites.some((f) => f.name.trim().toLowerCase() === item.name.trim().toLowerCase());
          return (
            <div className="np-log-item" key={`${item.kind}-${item.id}`}>
              <div className="np-log-ico" style={{ background: item.kind === "meal" ? "var(--brand-soft)" : "var(--fat-soft)", color: item.kind === "meal" ? "var(--brand)" : "var(--fat)", overflow: "hidden", padding: item.photoUrl ? 0 : undefined }}>
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt="meal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  item.kind === "meal" ? <Utensils size={17} /> : <Dumbbell size={17} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div className="np-log-name" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {item.name}
                  {item.kind === "meal" && (
                    <button
                      onClick={() => toggleFavorite(item)}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "inline-flex", color: isFav ? "#E8A23D" : "var(--ink-faint)" }}
                      title={isFav ? "Saved in Favorites" : "Save as favorite"}
                    >
                      <Star size={13} fill={isFav ? "#E8A23D" : "none"} />
                    </button>
                  )}
                </div>
                <div className="np-log-sub">{item.time}{item.kind === "meal" ? ` \u00B7 P${item.protein} C${item.carbs} F${item.fat}` : " \u00B7 activity"}</div>
              </div>
              <div className="np-log-val" style={{ color: item.kind === "activity" ? "var(--fat)" : "var(--ink)" }}>
                {item.kind === "activity" ? "\u2212" : ""}{item.calories}
              </div>
              <button className="np-log-del" onClick={() => (item.kind === "meal" ? removeMeal(item.id) : removeActivity(item.id))}>
                <Trash2 size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {showReminderEdit && (
        <ReminderModal reminder={reminder} setReminder={setReminder} onClose={() => setShowReminderEdit(false)} />
      )}
    </>
  );
}

function NfRow({ color, name, value, goal }) {
  return (
    <div className="nf-row">
      <span className="nf-swatch" style={{ background: color }} />
      <span className="nf-name">{name}</span>
      <div className="nf-track"><div className="nf-fill" style={{ width: `${pct(value, goal)}%`, background: color }} /></div>
      <span className="nf-amt">{value}g / {goal}g</span>
    </div>
  );
}

function LogActivityInline({ addActivity }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  if (!open) {
    return (
      <button className="np-btn np-btn-ghost" style={{ flex: 1 }} onClick={() => setOpen(true)}>
        <Dumbbell size={16} /> Log activity
      </button>
    );
  }
  return (
    <div className="np-modal-back" onClick={() => setOpen(false)}>
      <div className="np-modal" onClick={(e) => e.stopPropagation()}>
        <div className="np-modal-head">
          <div className="np-modal-title">Log activity</div>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div className="np-field"><label>Activity</label><input className="np-input" placeholder="e.g. 30 min run" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="np-field"><label>Calories burned</label><input className="np-input" type="number" placeholder="e.g. 250" value={cal} onChange={(e) => setCal(e.target.value)} /></div>
        <button
          className="np-btn np-btn-brand" style={{ width: "100%" }}
          onClick={() => { if (name && cal) { addActivity({ name, calories: Number(cal) }); setName(""); setCal(""); setOpen(false); } }}
        >
          <Check size={16} /> Add activity
        </button>
      </div>
    </div>
  );
}

function ReminderModal({ reminder, setReminder, onClose }) {
  const [local, setLocal] = useState(reminder);
  return (
    <div className="np-modal-back" onClick={onClose}>
      <div className="np-modal" onClick={(e) => e.stopPropagation()}>
        <div className="np-modal-head">
          <div className="np-modal-title">Water reminders</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>
        <div className="np-field">
          <label>Remind me every</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            {[30, 45, 60, 90, 120].map((m) => {
              const selected = local.interval === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLocal((l) => ({ ...l, interval: m }))}
                  style={{
                    flex: "1 1 calc(20% - 8px)",
                    minWidth: 50,
                    padding: "9px 6px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: selected ? 700 : 500,
                    background: selected ? "var(--brand)" : "var(--surface-2)",
                    color: selected ? "#FFF" : "var(--ink)",
                    border: selected ? "1px solid var(--brand)" : "1px solid var(--line)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    textAlign: "center"
                  }}
                >
                  {m} min
                </button>
              );
            })}
          </div>
        </div>
        <div className="np-grid2">
          <div className="np-field"><label>From</label><input className="np-input" type="time" value={local.start} onChange={(e) => setLocal((l) => ({ ...l, start: e.target.value }))} /></div>
          <div className="np-field"><label>Until</label><input className="np-input" type="time" value={local.end} onChange={(e) => setLocal((l) => ({ ...l, end: e.target.value }))} /></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            className="np-btn np-btn-ghost np-btn-sm"
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px", fontSize: 12.5 }}
            onClick={async () => {
              const granted = await requestNotificationPermission();
              if (granted) {
                showNotification("💧 Test — You're all set!", "Water reminders are working! JazzMacros will keep you hydrated all day. Stay locked in 💪");
              } else {
                alert("Please enable notification permissions for JazzMacros in your Android settings.");
              }
            }}
          >
            <Bell size={15} color="var(--brand)" /> ⚡ Send Test Notification Now
          </button>
        </div>
        <button className="np-btn np-btn-brand" style={{ width: "100%" }} onClick={() => { setReminder({ ...local, enabled: true }); onClose(); }}>
          <Check size={16} /> Save schedule
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* HABITS PAGE (Dedicated Fresh View)                                     */
/* ---------------------------------------------------------------------- */
function HabitsPage({ habits = {}, onToggle, water = 0, goals = DEFAULT_GOALS, totals = { calories: 0, protein: 0 }, meals = [], activities = [], onGoHome }) {

  /* ── Badge definitions ──────────────────────────────────────────── */
  const BADGES = [
    { name: "Clown",              minDays: 0,   idx: 0 },
    { name: "Noob",               minDays: 1,   idx: 1 },
    { name: "Novice",             minDays: 3,   idx: 2 },
    { name: "Average",            minDays: 7,   idx: 3 },
    { name: "Advanced",           minDays: 15,  idx: 4 },
    { name: "Sigma",              minDays: 30,  idx: 5 },
    { name: "Chad",               minDays: 45,  idx: 6 },
    { name: "Absolute Chad",      minDays: 60,  idx: 7 },
    { name: "Giga Chad",          minDays: 120, idx: 8 },
    { name: "Absolute Giga Chad", minDays: 365, idx: 9 },
  ];

  /* ── Habit list ─────────────────────────────────────────────────── */
  const burned = activities.reduce((s, a) => s + (Number(a.calories) || 0), 0);
  const targetWater   = Number(goals?.water)   || 2500;
  const targetProtein = Number(goals?.protein) || 140;
  const targetCals    = Number(goals?.calories) || 2200;
  const fullList = [
    { key: "water",    name: "Hydration (2.5L+)",   sub: `${water}ml logged`,                     icon: Droplet,   color: "var(--water)",   autoDone: water >= targetWater },
    { key: "protein",  name: "Hit Protein Target",   sub: `${totals.protein || 0}g / ${targetProtein}g`, icon: Utensils,  color: "var(--protein)", autoDone: (totals.protein || 0) >= targetProtein },
    { key: "meals",    name: "Log 3+ Meals",         sub: `${meals.length} meal${meals.length === 1 ? "" : "s"} tracked`, icon: Sparkles, color: "var(--carbs)", autoDone: meals.length >= 3 },
    { key: "activity", name: "Daily Exercise",       sub: `${burned} kcal burned`,                  icon: Dumbbell,  color: "var(--brand)",   autoDone: activities.length > 0 || burned >= 200 },
    { key: "sugar",    name: "Stay in Calorie Budget", sub: `${Math.max(0, targetCals - ((totals.calories || 0) - burned))} kcal remaining`, icon: Flame, color: "var(--accent)", autoDone: totals.calories > 0 && (totals.calories - burned) <= targetCals },
    { key: "sleep",    name: "8h Restful Sleep",     sub: "Tap to mark done",                      icon: Star,      color: "#8B5CF6",        autoDone: false },
  ];
  const completedCount = fullList.filter(h => habits[h.key] || h.autoDone).length;
  const halfDone = completedCount >= Math.ceil(fullList.length / 2);

  /* ── Streak persistence ─────────────────────────────────────────── */
  const STREAK_KEY = "jazz_habit_streak_v1";
  const todayStr = new Date().toISOString().slice(0, 10);

  const [streakData, setStreakData] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STREAK_KEY) || "null");
      if (s && s.startTs) return s;
    } catch {}
    return { days: 0, startTs: Date.now(), lastDate: null };
  });

  useEffect(() => {
    if (!halfDone) return;
    setStreakData(prev => {
      if (prev.lastDate === todayStr) return prev;
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      const consecutive = prev.lastDate === yStr;
      const next = {
        days: consecutive ? prev.days + 1 : 1,
        startTs: consecutive ? prev.startTs : Date.now(),
        lastDate: todayStr,
      };
      try { localStorage.setItem(STREAK_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [halfDone, todayStr]);

  /* ── Live timer (seconds since streak start) ────────────────────── */
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(Math.floor((Date.now() - streakData.startTs) / 1000));
    const id = setInterval(() =>
      setElapsed(Math.floor((Date.now() - streakData.startTs) / 1000)), 1000);
    return () => clearInterval(id);
  }, [streakData.startTs]);

  const hh = String(Math.floor((elapsed % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  /* ── Badge calculation ──────────────────────────────────────────── */
  const days = streakData.days;
  let curBadgeIdx = 0;
  for (let i = BADGES.length - 1; i >= 0; i--) {
    if (days >= BADGES[i].minDays) { curBadgeIdx = i; break; }
  }
  const curBadge  = BADGES[curBadgeIdx];
  const nextBadge = BADGES[curBadgeIdx + 1] || null;
  const ringProgress = nextBadge
    ? Math.min(1, (days - curBadge.minDays) / (nextBadge.minDays - curBadge.minDays))
    : 1;

  /* ── SVG ring math ──────────────────────────────────────────────── */
  const R    = 90;
  const circ = 2 * Math.PI * R;
  const ringColor = curBadgeIdx >= 7 ? "#F59E0B" : "#4ADE80";

  /* ── Badge sprite helper ─────────────────────────────────────────── */
  const BadgeAvatar = ({ idx, size = 80, unlocked = true, current = false }) => (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      backgroundImage: "url('/badge.png')",
      backgroundSize: "100% 1000%",
      backgroundPosition: `0% ${(idx / 9) * 100}%`,
      backgroundRepeat: "no-repeat",
      border: `${current ? 3 : 2}px solid ${current ? ringColor : unlocked ? "#555" : "#2A2A2A"}`,
      opacity: unlocked ? 1 : 0.3,
      filter: unlocked ? "none" : "grayscale(1)",
      transition: "opacity 0.3s, border-color 0.3s",
    }} />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#0D0D0D", color: "#fff" }}>

      {/* ── Sticky Header ─────────────────────────────────────────── */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#161616", borderBottom: "1px solid #222", position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={onGoHome}
          style={{ background: "#256B58", color: "#fff", border: "none", borderRadius: 12, width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,107,88,0.4)" }}>
          <Home size={20} />
        </button>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, letterSpacing: "-0.02em" }}>Habit Tracker</div>
        <div style={{ fontSize: 12, color: "#4ADE80", background: "rgba(74,222,128,0.12)", borderRadius: 20, padding: "4px 12px", fontWeight: 700 }}>
          🔥 {days} day{days !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="np-scroll" style={{ flex: 1, padding: "22px 18px 100px" }}>

        {/* ── Current Badge Card ─────────────────────────────────── */}
        <div style={{ background: "#181818", borderRadius: 20, padding: "28px 20px 22px", marginBottom: 20, display: "flex", flexDirection: "column", alignItems: "center", border: "1px solid #2A2A2A", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <BadgeAvatar idx={curBadge.idx} size={110} unlocked current />
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 16, letterSpacing: "-0.03em" }}>{curBadge.name}</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 3 }}>Current Badge</div>
          {nextBadge && (
            <div style={{ fontSize: 11.5, color: ringColor, marginTop: 10, background: `${ringColor}18`, borderRadius: 20, padding: "4px 14px", fontWeight: 700 }}>
              {nextBadge.minDays - days} day{nextBadge.minDays - days !== 1 ? "s" : ""} to unlock {nextBadge.name} →
            </div>
          )}
        </div>

        {/* ── Circular Streak Ring ───────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{ position: "relative", width: 220, height: 220 }}>
            <svg width={220} height={220} viewBox="0 0 220 220" style={{ transform: "rotate(-90deg)", display: "block" }}>
              <circle cx={110} cy={110} r={R} fill="none" stroke="#2A2A2A" strokeWidth={11} />
              <circle cx={110} cy={110} r={R} fill="none"
                stroke={ringColor} strokeWidth={11} strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ - circ * ringProgress}
                style={{ transition: "stroke-dashoffset 0.9s ease" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
              <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.05em" }}>{days}</div>
              <div style={{ fontSize: 13, color: "#666" }}>Days</div>
              <div style={{ fontSize: 14, fontFamily: "monospace", color: ringColor, letterSpacing: "0.05em", marginTop: 4 }}>{hh}:{mm}:{ss}</div>
            </div>
          </div>
        </div>

        {/* ── Progress bar to next badge ─────────────────────────── */}
        {nextBadge && (
          <div style={{ background: "#181818", borderRadius: 14, padding: "14px 16px", marginBottom: 22, border: "1px solid #2A2A2A" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: "#666" }}>Progress to <span style={{ color: "#fff", fontWeight: 700 }}>{nextBadge.name}</span></span>
              <span style={{ color: ringColor, fontWeight: 700 }}>{Math.round(ringProgress * 100)}%</span>
            </div>
            <div style={{ height: 6, background: "#2A2A2A", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${ringProgress * 100}%`, background: `linear-gradient(90deg, ${ringColor}, ${ringColor}aa)`, borderRadius: 3, transition: "width 0.6s ease" }} />
            </div>
          </div>
        )}

        {/* ── Today's Habits ─────────────────────────────────────── */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
          Today's Habits — {completedCount}/{fullList.length}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 26 }}>
          {fullList.map(item => {
            const isDone = habits[item.key] || item.autoDone;
            const Icon = item.icon;
            return (
              <div key={item.key}
                onClick={() => onToggle && onToggle(item.key)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: isDone ? "rgba(74,222,128,0.07)" : "#181818", border: `1.5px solid ${isDone ? "rgba(74,222,128,0.28)" : "#2A2A2A"}`, borderRadius: 14, cursor: "pointer", transition: "all 0.2s ease" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: isDone ? "rgba(74,222,128,0.15)" : "#222", display: "flex", alignItems: "center", justifyContent: "center", color: isDone ? "#4ADE80" : item.color, flexShrink: 0 }}>
                    <Icon size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: isDone ? "#4ADE80" : "#ddd" }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{item.sub}</div>
                  </div>
                </div>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: isDone ? "#4ADE80" : "#222", border: `2px solid ${isDone ? "#4ADE80" : "#3A3A3A"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s ease" }}>
                  {isDone && <Check size={14} strokeWidth={3} color="#000" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Badge Progression List ─────────────────────────────── */}
        <div style={{ fontSize: 11, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Badge Progression</div>
        <div style={{ background: "#181818", borderRadius: 18, overflow: "hidden", border: "1px solid #2A2A2A" }}>
          {BADGES.map((badge, i) => {
            const unlocked = days >= badge.minDays;
            const isCur    = i === curBadgeIdx;
            return (
              <div key={badge.name}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 16px", borderBottom: i < BADGES.length - 1 ? "1px solid #222" : "none", background: isCur ? `${ringColor}0D` : "transparent" }}>
                <BadgeAvatar idx={i} size={52} unlocked={unlocked} current={isCur} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: isCur ? ringColor : unlocked ? "#eee" : "#444" }}>{badge.name}</div>
                  <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>{badge.minDays}+ Days</div>
                </div>
                {isCur    && <span style={{ fontSize: 10, fontWeight: 700, background: ringColor, color: "#000", padding: "3px 9px", borderRadius: 20 }}>NOW</span>}
                {!isCur && unlocked && <Check size={15} color="#4ADE80" />}
                {!unlocked && <span style={{ fontSize: 13, opacity: 0.4 }}>🔒</span>}
              </div>
            );
          })}
        </div>

        {/* ── Back Button ───────────────────────────────────────── */}
        <div style={{ marginTop: 24 }}>
          <button type="button" onClick={onGoHome}
            style={{ width: "100%", padding: "14px", borderRadius: 14, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#256B58", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, boxShadow: "0 4px 20px rgba(37,107,88,0.4)" }}>
            <Home size={18} /> Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

const HabitTrackerModal = HabitsPage;




/* ---------------------------------------------------------------------- */
/* GOALS MODAL                                                            */
/* ---------------------------------------------------------------------- */
function GoalsModal({ goals, onClose, onSave }) {
  const [form, setForm] = useState({ ...goals });

  const setVal = (k) => (e) => setForm((prev) => ({ ...prev, [k]: Number(e.target.value) || 0 }));

  const applyPreset = (preset) => {
    const cals = form.calories || 2200;
    if (preset === "high-protein") {
      setForm((prev) => ({
        ...prev,
        protein: Math.round((cals * 0.40) / 4),
        carbs: Math.round((cals * 0.35) / 4),
        fat: Math.round((cals * 0.25) / 9),
      }));
    } else if (preset === "balanced") {
      setForm((prev) => ({
        ...prev,
        protein: Math.round((cals * 0.25) / 4),
        carbs: Math.round((cals * 0.50) / 4),
        fat: Math.round((cals * 0.25) / 9),
      }));
    } else if (preset === "keto") {
      setForm((prev) => ({
        ...prev,
        protein: Math.round((cals * 0.30) / 4),
        carbs: Math.round((cals * 0.10) / 4),
        fat: Math.round((cals * 0.60) / 9),
      }));
    }
  };

  return (
    <div className="np-modal-back" onClick={onClose}>
      <div className="np-modal" onClick={(e) => e.stopPropagation()}>
        <div className="np-modal-head">
          <div className="np-modal-title">Edit Daily Targets</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>

        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 12 }}>
          Synced with your Neon database. Dynamically updates calorie rings and JazzCoach advice.
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          <button className="np-chip" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => applyPreset("high-protein")}>High Protein</button>
          <button className="np-chip" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => applyPreset("balanced")}>Balanced</button>
          <button className="np-chip" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => applyPreset("keto")}>Keto/Low Carb</button>
        </div>

        <div className="np-field">
          <label>Daily Calorie Target (kcal)</label>
          <input className="np-input" type="number" value={form.calories} onChange={setVal("calories")} />
        </div>

        <div className="np-grid3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div className="np-field" style={{ marginBottom: 0 }}>
            <label style={{ color: "var(--protein)" }}>Protein (g)</label>
            <input className="np-input" type="number" value={form.protein} onChange={setVal("protein")} />
          </div>
          <div className="np-field" style={{ marginBottom: 0 }}>
            <label style={{ color: "#A9701C" }}>Carbs (g)</label>
            <input className="np-input" type="number" value={form.carbs} onChange={setVal("carbs")} />
          </div>
          <div className="np-field" style={{ marginBottom: 0 }}>
            <label style={{ color: "var(--fat)" }}>Fat (g)</label>
            <input className="np-input" type="number" value={form.fat} onChange={setVal("fat")} />
          </div>
        </div>

        <div className="np-field" style={{ marginBottom: 16 }}>
          <label>Daily Water Goal (ml)</label>
          <input className="np-input" type="number" value={form.water} onChange={setVal("water")} />
        </div>

        <button className="np-btn np-btn-accent" style={{ width: "100%" }} onClick={() => onSave(form)}>
          <Check size={16} /> Save Daily Goals
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* QUICK ADD MODAL                                                         */
/* ---------------------------------------------------------------------- */
function QuickAddModal({ favorites = [], onClose, onAddMeal, onAddActivity }) {
  const [mode, setMode] = useState("meal");
  const [form, setForm] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", fiber: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit() {
    if (!form.name || !form.calories) return;
    if (mode === "meal") {
      onAddMeal({
        name: form.name, calories: Number(form.calories) || 0, protein: Number(form.protein) || 0,
        carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0, fiber: Number(form.fiber) || 0,
      });
    } else {
      onAddActivity({ name: form.name, calories: Number(form.calories) || 0 });
    }
  }

  return (
    <div className="np-modal-back" onClick={onClose}>
      <div className="np-modal" onClick={(e) => e.stopPropagation()}>
        <div className="np-modal-head">
          <div className="np-modal-title">Quick add</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
        </div>

        {favorites.length > 0 && mode === "meal" && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
              <Star size={12} color="#E8A23D" fill="#E8A23D" /> Quick Favorites
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
              {favorites.map((fav) => (
                <button
                  key={fav.id}
                  className="np-sample"
                  style={{ whiteSpace: "nowrap", padding: "6px 10px", fontSize: 11 }}
                  onClick={() => {
                    onAddMeal({
                      name: fav.name, calories: fav.calories, protein: fav.protein,
                      carbs: fav.carbs, fat: fav.fat, fiber: fav.fiber
                    });
                  }}
                >
                  ⭐ {fav.name} ({fav.calories} kcal)
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="np-row-btns" style={{ marginBottom: 14 }}>
          <button className={mode === "meal" ? "np-btn np-btn-brand" : "np-btn np-btn-ghost"} style={{ flex: 1 }} onClick={() => setMode("meal")}>
            <Utensils size={15} /> Food
          </button>
          <button className={mode === "activity" ? "np-btn np-btn-brand" : "np-btn np-btn-ghost"} style={{ flex: 1 }} onClick={() => setMode("activity")}>
            <Dumbbell size={15} /> Activity
          </button>
        </div>
        <div className="np-field"><label>{mode === "meal" ? "Food name" : "Activity name"}</label>
          <input className="np-input" placeholder={mode === "meal" ? "e.g. Paneer Paratha, Moong Dal Khichdi" : "e.g. Gym Workout, Running"} value={form.name} onChange={set("name")} />
        </div>
        <div className="np-field"><label>{mode === "meal" ? "Calories" : "Calories burned"}</label>
          <input className="np-input" type="number" placeholder="0" value={form.calories} onChange={set("calories")} />
        </div>
        {mode === "meal" && (
          <div className="np-grid4" style={{ marginBottom: 12 }}>
            <div className="np-field" style={{ marginBottom: 0 }}><label>Protein (g)</label><input className="np-input" type="number" placeholder="0" value={form.protein} onChange={set("protein")} /></div>
            <div className="np-field" style={{ marginBottom: 0 }}><label>Carbs (g)</label><input className="np-input" type="number" placeholder="0" value={form.carbs} onChange={set("carbs")} /></div>
            <div className="np-field" style={{ marginBottom: 0 }}><label>Fat (g)</label><input className="np-input" type="number" placeholder="0" value={form.fat} onChange={set("fat")} /></div>
            <div className="np-field" style={{ marginBottom: 0 }}><label>Fiber (g)</label><input className="np-input" type="number" placeholder="0" value={form.fiber} onChange={set("fiber")} /></div>
          </div>
        )}
        <button className="np-btn np-btn-accent" style={{ width: "100%", marginTop: mode === "activity" ? 12 : 0 }} onClick={submit}>
          <Check size={16} /> Add to today's log
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* VOICE LOG                                                               */
/* ---------------------------------------------------------------------- */
function VoiceLog({ onItemsParsed }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false);
  const transcriptRef = useRef("");
  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Keep transcriptRef synced
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Audio transcription fallback using Gemini 3.6 Flash
  const processAudioWithGemini = async (audioBlob, mimeType) => {
    setParsing(true);
    setParseStatus("Transcribing voice with Gemini Flash AI...");
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result;
          const result = await parseAudioMeal(base64Data, mimeType);
          if (result && result.transcript) {
            setTranscript(result.transcript);
            transcriptRef.current = result.transcript;
            if (result.items && result.items.length > 0) {
              onItemsParsed(result.items);
              return;
            }
          } else if (result && result.items && result.items.length > 0) {
            onItemsParsed(result.items);
            return;
          }
        } catch (e) {
          console.warn("Gemini audio transcription inner failed:", e);
        } finally {
          setParsing(false);
          setParseStatus(null);
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (err) {
      console.warn("Audio reading failed:", err);
      setParsing(false);
      setParseStatus(null);
    }
  };

  // Stop recording cleanly & immediately
  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    isStartingRef.current = false;
    setListening(false);

    // 1. Immediately detach & stop speech recognition
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch (e) {
        try { rec.abort(); } catch (e2) {}
      }
    }

    // 2. Stop MediaRecorder cleanly
    if (mediaRecorderRef.current) {
      const recorder = mediaRecorderRef.current;
      mediaRecorderRef.current = null;
      try {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      } catch (e) {}
    }

    // 3. Stop all audio tracks
    if (mediaStreamRef.current) {
      const stream = mediaStreamRef.current;
      mediaStreamRef.current = null;
      try {
        stream.getTracks().forEach((track) => {
          try { track.stop(); } catch (e) {}
        });
      } catch (e) {}
    }
  }, []);

  // Toggle recording: click 1 = start, click 2 = stop immediately
  // IMPORTANT: Only use refs (isListeningRef / isStartingRef) in the condition check,
  // never React state — state can be stale inside a closure on fast clicks.
  const toggleListen = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Use REFS only — always current, never stale
    if (isListeningRef.current || isStartingRef.current) {
      stopListening();
      return;
    }

    isStartingRef.current = true;
    isListeningRef.current = true;
    setListening(true);
    setErrorMsg(null);

    // 1. Request microphone access
    let stream = null;
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Abort immediately if user stopped while waiting for permission
        if (!isListeningRef.current) {
          if (stream) stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
      }
    } catch (err) {
      console.warn("Microphone access error:", err);
      isListeningRef.current = false;
      isStartingRef.current = false;
      setListening(false);
      setErrorMsg("Microphone permission denied. Please allow access in browser settings, or type your meal below.");
      return;
    }

    isStartingRef.current = false;

    // Check again if cancelled during getUserMedia
    if (!isListeningRef.current) {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      return;
    }

    // 2. Start MediaRecorder (Gemini audio fallback)
    if (stream) {
      try {
        audioChunksRef.current = [];
        let mimeType = "audio/webm";
        if (typeof MediaRecorder !== "undefined") {
          if (!MediaRecorder.isTypeSupported("audio/webm")) {
            if (MediaRecorder.isTypeSupported("audio/mp4")) mimeType = "audio/mp4";
            else if (MediaRecorder.isTypeSupported("audio/ogg")) mimeType = "audio/ogg";
            else mimeType = "";
          }
          const recorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
          recorder.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
          };
          recorder.onstop = () => {
            const actualType = recorder.mimeType || mimeType || "audio/webm";
            if (audioChunksRef.current.length > 0) {
              const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
              if (!transcriptRef.current || transcriptRef.current.trim().length === 0) {
                processAudioWithGemini(audioBlob, actualType);
              }
            }
          };
          recorder.start(250);
          mediaRecorderRef.current = recorder;
        }
      } catch (recErr) {
        console.warn("MediaRecorder init notice:", recErr);
      }
    }

    // 3. Start Live Speech Recognition (primary)
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.onresult = (ev) => {
          let current = "";
          for (let i = 0; i < ev.results.length; i++) {
            current += ev.results[i][0].transcript + " ";
          }
          const text = current.trim();
          setTranscript(text);
          transcriptRef.current = text;
        };
        rec.onerror = (err) => {
          console.warn("Live speech recognition notice:", err.error || err);
        };
        rec.onend = () => {
          // Only auto-restart if still recording and this rec instance is still active
          if (isListeningRef.current && recognitionRef.current === rec) {
            try { rec.start(); } catch (e) {}
          }
        };
        rec.start();
        recognitionRef.current = rec;
      } catch (err) {
        console.warn("Live speech recognition start failed:", err);
      }
    }
  }, [stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => stopListening();
  }, [stopListening]);

  const handleParse = async () => {
    const text = transcript.trim();
    if (!text || parsing) return;
    if (isListeningRef.current || listening) {
      stopListening();
    }
    setParsing(true);
    setParseStatus("Analyzing meal with JazzCoach AI...");
    try {
      const parsedItems = await parseSpokenMeal(text);
      if (parsedItems && parsedItems.length > 0) {
        onItemsParsed(parsedItems);
      } else {
        setErrorMsg("JazzCoach could not detect meal items. Try speaking clearly (e.g. '2 besan chillas, curd, and a glass of chaas').");
      }
    } catch (err) {
      console.error("Spoken meal parse error:", err);
      setErrorMsg("Failed to analyze meal with JazzCoach AI. Please try again.");
    } finally {
      setParsing(false);
      setParseStatus(null);
    }
  };

  return (
    <div className="np-card" style={{ textAlign: "center", padding: "20px 16px" }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "var(--ink)", letterSpacing: "-0.02em", marginBottom: 6 }}>
        Speak your meal
      </div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.45, maxWidth: 340, margin: "0 auto 16px" }}>
        Say what you ate in natural English &mdash; JazzCoach parses calories & macros automatically. Tap the microphone once to start, tap again to stop.
      </div>

      {errorMsg && (
        <div style={{
          background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 10,
          padding: "10px 14px", marginBottom: 14, fontSize: 12.5, color: "#991B1B",
          display: "flex", alignItems: "center", gap: 8, textAlign: "left"
        }}>
          <Info size={16} style={{ flexShrink: 0 }} />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Pulse ring sits BEHIND the button (lower z-index) so it never eats clicks */}
      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", margin: "6px auto 12px" }}>
        {listening && (
          <div
            className="np-mic-pulse"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,          /* behind the button */
              pointerEvents: "none"
            }}
          />
        )}
        <button
          type="button"
          onClick={toggleListen}
          className="np-btn"
          aria-label={listening ? "Stop microphone recording" : "Start microphone recording"}
          style={{
            position: "relative",
            zIndex: 2,            /* always on top */
            width: 78, height: 78, borderRadius: "50%",
            background: listening
              ? "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
              : "linear-gradient(135deg, #256B58 0%, #1A5243 100%)",
            color: "#fff", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: listening ? "0 0 28px rgba(239,68,68,0.65)" : "0 8px 22px rgba(31,93,76,0.28)",
            transition: "all 0.25s ease",
            WebkitTapHighlightColor: "transparent"  /* remove tap flash on mobile */
          }}
        >
          {listening ? <MicOff size={32} /> : <Mic size={32} />}
        </button>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
        {listening ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#DC2626", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#DC2626", display: "inline-block", animation: "pulse 1s infinite" }} />
              Recording... tap the red mic to stop
            </span>
          </div>
        ) : parseStatus ? (
          <span style={{ color: "var(--brand)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={14} className="spin" /> {parseStatus}
          </span>
        ) : (
          <span style={{ color: transcript ? "var(--brand)" : "var(--ink-soft)" }}>
            {transcript ? "Voice captured — tap mic to record more or extract below" : "Tap microphone to speak (Click again to stop)"}
          </span>
        )}
      </div>

      <div style={{ textAlign: "left", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Spoken Meal Description
          </span>
          {transcript && (
            <button
              onClick={() => setTranscript("")}
              style={{ background: "none", border: "none", color: "var(--ink-faint)", fontSize: 11, cursor: "pointer", fontWeight: 600, padding: 0 }}
            >
              Clear
            </button>
          )}
        </div>
        <textarea
          className="np-input"
          style={{
            width: "100%",
            boxSizing: "border-box",
            height: 78,
            resize: "none",
            fontFamily: "var(--font-body)",
            fontSize: 13.5,
            lineHeight: 1.45,
            borderRadius: 12,
            background: "var(--surface)",
            padding: "10px 12px",
            border: "1.5px solid var(--line)"
          }}
          placeholder="e.g. 2 Besan chillas with curd and 1 cup spiced masala chai..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, justifyContent: "center" }}>
        <button className="np-voice-pill" onClick={() => setTranscript("150g grilled chicken breast with 1 cup brown rice and salad")}>
          🍗 Grilled Chicken & Rice
        </button>
        <button className="np-voice-pill" onClick={() => setTranscript("200g paneer bhurji with 2 multigrain rotis")}>
          🧀 Paneer Bhurji & Rotis
        </button>
        <button className="np-voice-pill" onClick={() => setTranscript("3-egg bhurji with 1 glass chilled masala chaas")}>
          🍳 Egg Bhurji & Chaas
        </button>
        <button className="np-voice-pill" onClick={() => setTranscript("1 bowl moong dal khichdi with 1 cup fresh dahi")}>
          🥣 Dal Khichdi & Dahi
        </button>
      </div>

      <button
        className="np-btn np-btn-accent"
        style={{
          width: "100%",
          padding: "13px 16px",
          borderRadius: 14,
          opacity: (!transcript.trim() || parsing) ? 0.65 : 1,
          cursor: (!transcript.trim() || parsing) ? "not-allowed" : "pointer"
        }}
        onClick={handleParse}
        disabled={!transcript.trim() || parsing}
      >
        <Sparkles size={16} /> {parsing ? (parseStatus || "Analyzing with JazzCoach...") : "Extract Macros with JazzCoach"}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* BARCODE & PACKAGING LOG (Open Food Facts + Gemini 3.6 Flash)           */
/* ---------------------------------------------------------------------- */
function BarcodeLog({ onAddMeal, remaining }) {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [result, setResult] = useState(null);
  const [servings, setServings] = useState(1);
  const [cameraActive, setCameraActive] = useState(false);
  const [labelScanning, setLabelScanning] = useState(false);
  const [barcodeNotice, setBarcodeNotice] = useState(null);

  // Persist last 5 scanned products across sessions
  const RECENT_KEY = "jazz_recent_barcodes_v1";
  const [recentScans, setRecentScans] = useState(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
    catch { return []; }
  });

  const pushRecentScan = (code, product) => {
    setRecentScans(prev => {
      const entry = { code, name: product.name, calories: product.calories, brand: product.brand };
      // Deduplicate by barcode code, newest first, max 5
      const filtered = prev.filter(r => r.code !== code);
      const next = [entry, ...filtered].slice(0, 5);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const labelInputRef = useRef(null);

  // Look up barcode: Cache -> Open Food Facts World -> Open Food Facts India -> Gemini Exact -> Gemini Estimate
  const lookupBarcode = async (code) => {
    const cleanCode = String(code || barcode).trim();
    if (!cleanCode) return;

    // 0. Check Instant Local / GTIN Cache (0ms latency)
    const cached = getCachedBarcode(cleanCode);
    if (cached) {
      setResult(cached);
      setServings(1);
      setLoading(false);
      setLoadingMsg("");
      return;
    }

    setLoading(true);
    setLoadingMsg("Checking Open Food Facts...");
    setResult(null);

    let productData = null;

    // Helper to parse OFT product object
    const parseOFFProduct = (p) => {
      const rawName = (p.product_name || p.generic_name || "").trim();
      const lowerName = rawName.toLowerCase();
      const isGeneric = !rawName || lowerName === "packaged food" || lowerName === "packaged product" || lowerName === "unknown" || lowerName === "test";
      const cals = Math.round(Number(p.nutriments?.["energy-kcal_serving"] || p.nutriments?.["energy-kcal_100g"] || 0));
      const protein = Math.round((Number(p.nutriments?.["proteins_serving"] || p.nutriments?.["proteins_100g"] || 0)) * 10) / 10;
      const carbs = Math.round((Number(p.nutriments?.["carbohydrates_serving"] || p.nutriments?.["carbohydrates_100g"] || 0)) * 10) / 10;
      const fat = Math.round((Number(p.nutriments?.["fat_serving"] || p.nutriments?.["fat_100g"] || 0)) * 10) / 10;
      const fiber = Math.round((Number(p.nutriments?.["fiber_serving"] || p.nutriments?.["fiber_100g"] || 0)) * 10) / 10;
      const imageUrl = p.image_url || p.image_front_url || p.image_small_url || null;
      if (!isGeneric && (cals > 0 || protein > 0 || carbs > 0)) {
        const brand = p.brands ? p.brands.split(",")[0].trim() : "";
        return {
          name: brand ? `${rawName} (${brand})` : rawName,
          brand: brand || "Packaged Product",
          category: p.categories ? p.categories.split(",")[0].trim() : "Packaged Item",
          servingSize: p.serving_size || "100g",
          calories: cals, protein, carbs, fat, fiber, imageUrl,
          country: p.countries ? p.countries.split(",")[0].trim() : "Verified",
          ingredients: p.ingredients_text || "",
          nutriscore: p.nutriscore_grade ? p.nutriscore_grade.toUpperCase() : null,
          source: "Open Food Facts (Verified)"
        };
      }
      return null;
    };

    // 1. Try Open Food Facts World
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanCode}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 1 && data.product) productData = parseOFFProduct(data.product);
      }
    } catch (e) { console.warn("OFT World:", e); }

    // 1b. Try Open Food Facts India (better coverage for Indian GTINs)
    if (!productData) {
      try {
        setLoadingMsg("Checking India food database...");
        const res = await fetch(`https://in.openfoodfacts.org/api/v0/product/${cleanCode}.json`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 1 && data.product) productData = parseOFFProduct(data.product);
        }
      } catch (e) { console.warn("OFT India:", e); }
    }

    // 1c. Try UPCitemdb (real barcode database, good for packaged goods)
    if (!productData) {
      try {
        setLoadingMsg("Checking UPC barcode database...");
        const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.code === "OK" && data.items && data.items.length > 0) {
            const item = data.items[0];
            const title = (item.title || item.description || "").trim();
            // UPCitemdb sometimes has nutrition in offers or nutriments
            const nut = item.nutriments || {};
            const cals = Math.round(Number(nut.calories || nut.energy_kcal || 0));
            const protein = Math.round((Number(nut.protein || 0)) * 10) / 10;
            const carbs = Math.round((Number(nut.carbohydrate || 0)) * 10) / 10;
            const fat = Math.round((Number(nut.fat || 0)) * 10) / 10;
            if (title) {
              productData = {
                name: item.brand ? `${title} (${item.brand})` : title,
                brand: item.brand || "Packaged Product",
                category: item.category || "Packaged Item",
                servingSize: nut.serving_size || "1 serving",
                calories: cals, protein, carbs, fat, fiber: 0,
                imageUrl: (item.images && item.images[0]) || null,
                country: "Verified",
                ingredients: item.ingredients || "",
                nutriscore: null,
                source: "UPCitemdb (Verified)"
              };
            }
          }
        }
      } catch (e) { console.warn("UPCitemdb:", e); }
    }

    // 2. Gemini Flash exact barcode lookup
    if (!productData) {
      setLoadingMsg("Consulting Gemini Flash AI barcode database...");
      try {
        const aiProduct = await lookupProductByBarcodeAI(cleanCode);
        if (aiProduct && aiProduct.found !== false && aiProduct.name && (Number(aiProduct.calories) > 0 || Number(aiProduct.protein) > 0)) {
          productData = {
            name: aiProduct.brand ? `${aiProduct.name} (${aiProduct.brand})` : aiProduct.name,
            brand: aiProduct.brand || "Brand Match",
            category: aiProduct.category || "Food & Beverage",
            servingSize: aiProduct.servingSize || "1 serving",
            calories: Math.round(Number(aiProduct.calories) || 0),
            protein: Math.round((Number(aiProduct.protein) || 0) * 10) / 10,
            carbs: Math.round((Number(aiProduct.carbs) || 0) * 10) / 10,
            fat: Math.round((Number(aiProduct.fat) || 0) * 10) / 10,
            fiber: Math.round((Number(aiProduct.fiber) || 0) * 10) / 10,
            imageUrl: null,
            country: aiProduct.country || "Global",
            ingredients: aiProduct.ingredients || "",
            nutriscore: null,
            source: "Gemini Flash AI (GTIN Intelligence)"
          };
        }
      } catch (aiErr) { console.error("Gemini barcode lookup error:", aiErr); }
    }

    // 3. Gemini estimate by GS1 company prefix (brand inference)
    if (!productData) {
      setLoadingMsg("Estimating product via brand prefix...");
      try {
        const est = await estimateProductByBarcodeAI(cleanCode);
        if (est && est.found !== false && est.name && (Number(est.calories) > 0 || Number(est.protein) > 0 || Number(est.carbs) > 0)) {
          productData = {
            name: est.brand ? `${est.name} (${est.brand})` : est.name,
            brand: est.brand || "Inferred",
            category: est.category || "Food & Beverage",
            servingSize: est.servingSize || "1 serving",
            calories: Math.round(Number(est.calories) || 0),
            protein: Math.round((Number(est.protein) || 0) * 10) / 10,
            carbs: Math.round((Number(est.carbs) || 0) * 10) / 10,
            fat: Math.round((Number(est.fat) || 0) * 10) / 10,
            fiber: Math.round((Number(est.fiber) || 0) * 10) / 10,
            imageUrl: null, country: est.country || "India",
            ingredients: est.ingredients || "", nutriscore: null,
            source: `Gemini AI (Brand Estimate${est.note ? " — " + est.note : ""})`
          };
        }
      } catch (estErr) { console.error("Gemini estimate error:", estErr); }
    }

    if (productData) {
      setCachedBarcode(cleanCode, productData);
      pushRecentScan(cleanCode, productData);
      setResult(productData);
      setServings(1);
    } else {
      setLoadingMsg(`❌ No data found for barcode ${cleanCode}. Try 'Scan Label (AI)' to photo the nutrition label.`);
      setTimeout(() => setLoadingMsg(""), 6000);
    }

    setLoading(false);
  };

  // Direct OCR Nutrition Table / Box with Gemini Flash (Canvas-Compressed)
  const handleLabelScan = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setLabelScanning(true);
    setLoadingMsg("Optimizing image & running Gemini Flash OCR...");
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        // High-speed client-side canvas downsample
        const compressedBase64 = await compressImageBase64(event.target.result);
        const detected = await analyzeNutritionLabel(compressedBase64, "image/jpeg");
        if (detected && detected.name) {
          const ocrResult = {
            name: detected.brand ? `${detected.name} (${detected.brand})` : detected.name,
            brand: detected.brand || "Packaged Food",
            category: "Packaging / Box Scan",
            servingSize: detected.servingSize || "1 serving",
            calories: Math.round(Number(detected.calories) || 0),
            protein: Math.round((Number(detected.protein) || 0) * 10) / 10,
            carbs: Math.round((Number(detected.carbs) || 0) * 10) / 10,
            fat: Math.round((Number(detected.fat) || 0) * 10) / 10,
            fiber: Math.round((Number(detected.fiber) || 0) * 10) / 10,
            imageUrl: compressedBase64,
            country: "OCR Scanned",
            ingredients: detected.ingredients || "",
            nutriscore: null,
            source: "Gemini Flash AI (Label OCR)"
          };
          setResult(ocrResult);
          setServings(1);
        } else {
          setBarcodeNotice("Gemini Flash could not clearly read the nutrition table. Please ensure good lighting and try again.");
        }
      } catch (ocrErr) {
        console.error("Gemini nutrition label OCR failed:", ocrErr);
        setBarcodeNotice("Failed to read nutrition label with Gemini Flash AI.");
      } finally {
        setLabelScanning(false);
        setLoadingMsg("");
      }
    };
    reader.readAsDataURL(file);
  };

  const startCameraBarcode = () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setBarcodeNotice("Camera is not available on this device.");
      return;
    }
    setCameraActive(true);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        if ("BarcodeDetector" in window) {
          try {
            const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"] });
            scanIntervalRef.current = setInterval(async () => {
              if (!videoRef.current || !streamRef.current) {
                if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
                return;
              }
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const detectedCode = barcodes[0].rawValue;
                  if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
                  stopCameraBarcode();
                  setBarcode(detectedCode);
                  lookupBarcode(detectedCode);
                }
              } catch (e) {}
            }, 350);
          } catch (detErr) {
            console.warn("BarcodeDetector error:", detErr);
          }
        }
      })
      .catch((err) => {
        console.error("Camera access failed:", err);
        setBarcodeNotice("Camera permission denied or camera unavailable.");
        setCameraActive(false);
      });
  };

  const stopCameraBarcode = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCameraBarcode();
  }, []);

  return (
    <>
      <div className="np-card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Scan product barcode & nutrition labels</div>
        <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 14 }}>
          Look up verified nutrition via Open Food Facts &amp; Gemini Flash AI, or snap a photo of any nutrition box.
        </div>

        {barcodeNotice && (
          <div style={{
            background: "#2A1815",
            border: "1px solid #FF6B47",
            color: "#FFA896",
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 12.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8
          }}>
            <span>{barcodeNotice}</span>
            <button
              type="button"
              onClick={() => setBarcodeNotice(null)}
              style={{ background: "none", border: "none", color: "#FFA896", cursor: "pointer", display: "flex" }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {cameraActive && (
          <div style={{ position: "relative", marginBottom: 14, borderRadius: 12, overflow: "hidden", background: "#000" }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: 200, objectFit: "cover" }} />
            <div style={{
              position: "absolute", inset: "20% 15%", border: "2px solid #256B58", borderRadius: 8,
              boxShadow: "0 0 0 1000px rgba(0,0,0,0.4)"
            }} />
            <button
              onClick={stopCameraBarcode}
              style={{
                position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.6)",
                color: "#fff", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Hidden file picker for nutrition label photo */}
        <input
          ref={labelInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handleLabelScan}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <button className="np-btn np-btn-brand np-btn-sm" onClick={cameraActive ? stopCameraBarcode : startCameraBarcode} style={{ justifyContent: "center" }}>
            <Camera size={15} /> {cameraActive ? "Stop Camera" : "Scan Barcode"}
          </button>
          <button
            className="np-btn np-btn-accent np-btn-sm"
            onClick={() => labelInputRef.current && labelInputRef.current.click()}
            disabled={labelScanning}
            style={{ justifyContent: "center" }}
          >
            <Sparkles size={15} /> {labelScanning ? "Reading Label..." : "Scan Label (AI)"}
          </button>
        </div>

        {/* ── Recently Scanned chips ─────────────────────────── */}
        {recentScans.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                🕐 Recently Scanned
              </span>
              <button
                onClick={() => {
                  setRecentScans([]);
                  try { localStorage.removeItem(RECENT_KEY); } catch {}
                }}
                style={{ fontSize: 10.5, color: "var(--ink-faint)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
              >
                Clear
              </button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {recentScans.map((scan) => (
                <button
                  key={scan.code}
                  className="np-chip"
                  title={`${scan.name} — ${scan.calories} kcal`}
                  onClick={() => {
                    setBarcode(scan.code);
                    // Load instantly from cache (no network needed)
                    const cached = getCachedBarcode(scan.code);
                    if (cached) {
                      setResult(cached);
                      setServings(1);
                    } else {
                      lookupBarcode(scan.code);
                    }
                  }}
                  style={{
                    fontSize: 11,
                    padding: "5px 10px",
                    display: "inline-flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 1,
                    lineHeight: 1.3,
                    maxWidth: 140,
                    textAlign: "left"
                  }}
                >
                  <span style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                    {scan.name.length > 22 ? scan.name.slice(0, 22) + "…" : scan.name}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--ink-soft)", fontWeight: 500 }}>{scan.calories} kcal</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="np-search-bar" style={{ marginBottom: 12 }}>
          <Barcode size={18} color="var(--ink-faint)" />
          <input
            placeholder="Or enter barcode e.g. 8901491101837"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookupBarcode()}
          />
          <button
            onClick={() => lookupBarcode()}
            className="np-btn np-btn-accent np-btn-sm"
            style={{ padding: "6px 14px" }}
            disabled={loading || labelScanning}
          >
            {loading ? "..." : "Lookup"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600 }}>Try Barcode:</span>
          <button className="np-chip" style={{ fontSize: 10.5, padding: "4px 8px" }} onClick={() => { setBarcode("8901491101837"); lookupBarcode("8901491101837"); }}>
            🌽 Kurkure Masala Munch
          </button>
          <button className="np-chip" style={{ fontSize: 10.5, padding: "4px 8px" }} onClick={() => { setBarcode("8901262010016"); lookupBarcode("8901262010016"); }}>
            🧈 Amul Butter
          </button>
          <button className="np-chip" style={{ fontSize: 10.5, padding: "4px 8px" }} onClick={() => { setBarcode("8901058017687"); lookupBarcode("8901058017687"); }}>
            🍜 Maggi 2-Min
          </button>
          <button className="np-chip" style={{ fontSize: 10.5, padding: "4px 8px" }} onClick={() => { setBarcode("8901719101014"); lookupBarcode("8901719101014"); }}>
            🍪 Parle-G
          </button>
          <button className="np-chip" style={{ fontSize: 10.5, padding: "4px 8px" }} onClick={() => { setBarcode("030000010402"); lookupBarcode("030000010402"); }}>
            🥣 Quaker Oats
          </button>
          <button className="np-chip" style={{ fontSize: 10.5, padding: "4px 8px" }} onClick={() => { setBarcode("3017620422003"); lookupBarcode("3017620422003"); }}>
            🌰 Nutella
          </button>
        </div>
      </div>

      {/* Modern Shimmer Skeleton Loader */}
      {(loading || labelScanning) && (
        <div className="np-skeleton-card">
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div className="np-shimmer" style={{ width: 54, height: 54, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="np-shimmer" style={{ height: 14, width: "65%", marginBottom: 6 }} />
              <div className="np-shimmer" style={{ height: 10, width: "40%" }} />
            </div>
          </div>
          <div className="np-shimmer" style={{ height: 28, width: "100%", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <div className="np-shimmer" style={{ height: 20, width: 65 }} />
            <div className="np-shimmer" style={{ height: 20, width: 65 }} />
            <div className="np-shimmer" style={{ height: 20, width: 65 }} />
          </div>
          <div style={{
            fontSize: 12, color: "var(--brand)", fontWeight: 700, marginTop: 10,
            display: "flex", alignItems: "center", gap: 6, justifyContent: "center"
          }}>
            <Sparkles size={14} className="spin" /> {loadingMsg || "Verifying product data..."}
          </div>
        </div>
      )}

      {result && (() => {
        const curCals = Math.round(result.calories * servings);
        const curProt = Math.round(result.protein * servings * 10) / 10;
        const remCals = remaining?.calories ?? 9999;
        const remProt = remaining?.protein ?? 1;
        const fitsCals = curCals <= remCals;

        return (
          <div className="np-item-card" style={{ border: "1.5px solid var(--brand-soft)", padding: 14 }}>
            <div className="np-item-top" style={{ alignItems: "flex-start", gap: 10 }}>
              {result.imageUrl && (
                <img
                  src={result.imageUrl}
                  alt={result.name}
                  style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)", flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                  <span className="np-tag" style={{ background: "var(--brand-soft)", color: "var(--brand)", fontSize: 10.5, fontWeight: 700 }}>
                    {result.source}
                  </span>
                  {result.nutriscore && (
                    <span className="np-tag" style={{ background: "#DCFCE7", color: "#15803D", fontSize: 10.5, fontWeight: 700 }}>
                      Nutri-Score {result.nutriscore}
                    </span>
                  )}
                  {result.brand && (
                    <span className="np-tag" style={{ background: "var(--surface-2)", color: "var(--ink-soft)", fontSize: 10.5 }}>
                      {result.brand}
                    </span>
                  )}
                </div>
                <div className="np-item-name" style={{ fontSize: 15, lineHeight: 1.3 }}>{result.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
                  Standard serving: {result.servingSize} &middot; {result.category || "Packaged Food"}
                </div>
              </div>
              <button onClick={() => setResult(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", padding: 2 }}>
                <X size={18} />
              </button>
            </div>

            {/* ⚠️ AI Disclaimer — shown when Gemini guessed the product */}
            {result.source && result.source.includes("Gemini") && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                background: "#FFFBEB", border: "1.5px solid #FCD34D",
                borderRadius: 10, padding: "9px 12px", marginTop: 10,
                fontSize: 12, color: "#92400E", lineHeight: 1.45
              }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700 }}>AI-estimated product</span> — the name or macros may not be exact for this specific barcode.
                  <span
                    onClick={() => labelInputRef.current && labelInputRef.current.click()}
                    style={{ display: "inline", marginLeft: 6, color: "#D97706", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Snap the nutrition label for accurate data →
                  </span>
                </div>
              </div>
            )}

            {/* Contextual Macro Impact Card */}
            {remaining && (
              <div
                className="np-macro-fit-banner"
                style={{
                  background: fitsCals ? "#F0FDF4" : "#FEF2F2",
                  border: `1.5px solid ${fitsCals ? "#86EFAC" : "#FCA5A5"}`,
                  color: fitsCals ? "#166534" : "#991B1B",
                }}
              >
                {fitsCals ? <Check size={16} color="#166534" /> : <Flame size={16} color="#DC2626" />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>
                    {fitsCals
                      ? `Fits your daily calorie budget (+ leaves ${remCals - curCals} kcal)`
                      : `Exceeds daily remaining ceiling by ${curCals - remCals} kcal`}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.9, marginTop: 1 }}>
                    Fulfills {Math.min(100, Math.round((curProt / Math.max(1, remProt)) * 100))}% of remaining daily protein ({remProt}g open)
                  </div>
                </div>
              </div>
            )}

            <div className="np-stepper" style={{ marginTop: 12 }}>
              <button onClick={() => setServings((s) => Math.max(0.5, s - 0.5))}>&minus;</button>
              <span style={{ fontWeight: 700, fontSize: 13, minWidth: 90, textAlign: "center" }}>
                {servings} serving{servings !== 1 ? "s" : ""}
              </span>
              <button onClick={() => setServings((s) => s + 0.5)}>+</button>
              <span style={{ marginLeft: "auto", fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 17, color: "var(--brand)" }}>
                {curCals} kcal
              </span>
            </div>

            <div className="np-macro-tags" style={{ marginTop: 10 }}>
              <span className="np-tag" style={{ background: "var(--protein-soft)", color: "var(--protein)", fontWeight: 700 }}>
                P {curProt}g
              </span>
              <span className="np-tag" style={{ background: "var(--carbs-soft)", color: "#A9701C", fontWeight: 700 }}>
                C {Math.round(result.carbs * servings * 10) / 10}g
              </span>
              <span className="np-tag" style={{ background: "var(--fat-soft)", color: "var(--fat)", fontWeight: 700 }}>
                F {Math.round(result.fat * servings * 10) / 10}g
              </span>
              <span className="np-tag" style={{ background: "#EFE8FA", color: "var(--fiber)", fontWeight: 700 }}>
                Fiber {Math.round(result.fiber * servings * 10) / 10}g
              </span>
            </div>

            {result.ingredients && (
              <div style={{
                fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.4, marginTop: 10,
                padding: "8px 10px", background: "var(--surface-2)", borderRadius: 8,
                border: "1px solid var(--line)"
              }}>
                <strong>Ingredients:</strong> {result.ingredients.length > 140 ? result.ingredients.slice(0, 140) + "..." : result.ingredients}
              </div>
            )}

            <button
              className="np-btn np-btn-accent"
              style={{ width: "100%", marginTop: 12, padding: "12px 14px", borderRadius: 12, justifyContent: "center" }}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(40);
                onAddMeal({
                  name: `${result.name} x${servings}`,
                  calories: curCals,
                  protein: curProt,
                  carbs: Math.round(result.carbs * servings * 10) / 10,
                  fat: Math.round(result.fat * servings * 10) / 10,
                  fiber: Math.round(result.fiber * servings * 10) / 10,
                });
                setResult(null);
                setBarcode("");
              }}
            >
              <Check size={16} /> Add to Today's Log
            </button>
          </div>
        );
      })()}
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* SCAN & LOG                                                              */
/* ---------------------------------------------------------------------- */
const SAMPLE_TEST_MEALS = [
  {
    icon: "🥗",
    title: "Grilled Chicken Bowl",
    kcal: 380,
    p: 42,
    items: [
      { name: "Grilled Chicken Breast", qty: 150, unit: "g", calories: 248, protein: 46, carbs: 0, fat: 5.4, fiber: 0 },
      { name: "Brown Rice", qty: 100, unit: "g", calories: 111, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8 },
      { name: "Steamed Broccoli", qty: 80, unit: "g", calories: 28, protein: 2.2, carbs: 5.6, fat: 0.3, fiber: 2.1 },
    ]
  },
  {
    icon: "🍲",
    title: "Paneer Tikka & Roti",
    kcal: 480,
    p: 26,
    items: [
      { name: "Paneer Tikka (Tandoori)", qty: 140, unit: "g", calories: 310, protein: 21, carbs: 6, fat: 22, fiber: 1 },
      { name: "Whole Wheat Roti (2 pcs)", qty: 2, unit: "pcs", calories: 170, protein: 5.2, carbs: 32, fat: 2.2, fiber: 4 },
    ]
  },
  {
    icon: "🥣",
    title: "Oatmeal, Whey & Berries",
    kcal: 360,
    p: 32,
    items: [
      { name: "Rolled Oats", qty: 50, unit: "g", calories: 190, protein: 6.5, carbs: 34, fat: 3.5, fiber: 5 },
      { name: "Whey Protein Isolate", qty: 30, unit: "g", calories: 120, protein: 25, carbs: 1.5, fat: 1, fiber: 0 },
      { name: "Blueberries & Strawberries", qty: 80, unit: "g", calories: 45, protein: 0.7, carbs: 11, fat: 0.3, fiber: 2.5 },
    ]
  },
  {
    icon: "🍳",
    title: "3 Scrambled Eggs & Toast",
    kcal: 390,
    p: 24,
    items: [
      { name: "Scrambled Whole Eggs (3)", qty: 3, unit: "large", calories: 220, protein: 18, carbs: 2, fat: 15, fiber: 0 },
      { name: "Multigrain Sourdough Toast", qty: 2, unit: "slices", calories: 170, protein: 6, carbs: 30, fat: 2, fiber: 4 },
    ]
  }
];

function LiveCameraView({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [cameraError, setCameraError] = useState(null);
  const [flash, setFlash] = useState(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startStream = useCallback(async (mode) => {
    stopStream();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Live camera is not supported in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera stream error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera permission denied. Please allow camera in browser settings.");
      } else {
        setCameraError("Unable to access camera on this device.");
      }
    }
  }, [stopStream]);

  useEffect(() => {
    startStream(facingMode);
    return () => stopStream();
  }, [facingMode, startStream, stopStream]);

  const snap = () => {
    if (!videoRef.current) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    try {
      const vid = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = vid.videoWidth || 640;
      canvas.height = vid.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      stopStream();
      onCapture(dataUrl);
    } catch (e) {
      console.error("Frame capture error:", e);
    }
  };

  const toggleCamera = () => {
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
  };

  return (
    <div style={{
      position: "relative",
      borderRadius: 18,
      overflow: "hidden",
      background: "#080F0D",
      minHeight: 320,
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      border: "1px solid var(--line)"
    }}>
      {cameraError ? (
        <div style={{ padding: 24, textAlign: "center", color: "#FFF" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>📷</div>
          <div style={{ fontSize: 13, color: "#FFA896", marginBottom: 16 }}>{cameraError}</div>
          <button
            type="button"
            className="np-btn np-btn-ghost"
            onClick={onClose}
            style={{ color: "#FFF", borderColor: "rgba(255,255,255,0.3)" }}
          >
            Close &amp; Upload Photo
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: 320,
              objectFit: "cover",
              transform: facingMode === "user" ? "scaleX(-1)" : "none"
            }}
          />

          {flash && (
            <div style={{
              position: "absolute",
              inset: 0,
              background: "#FFF",
              zIndex: 35,
              opacity: 0.85
            }} />
          )}

          {/* Viewfinder Reticle Frame */}
          <div style={{
            position: "absolute",
            inset: 24,
            border: "2px dashed rgba(95, 227, 179, 0.65)",
            borderRadius: 16,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <div style={{
              background: "rgba(0,0,0,0.65)",
              color: "#5FE3B3",
              fontSize: 11.5,
              fontWeight: 700,
              padding: "4px 12px",
              borderRadius: 20,
              backdropFilter: "blur(6px)",
              letterSpacing: "0.2px"
            }}>
              JazzCoach AI • Point at meal
            </div>
          </div>

          {/* Controls Bar */}
          <div style={{
            position: "absolute",
            bottom: 16,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: "0 24px",
            zIndex: 25
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.65)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#FFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
              title="Close Camera"
            >
              <X size={20} />
            </button>

            <button
              type="button"
              onClick={snap}
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: "#FFF",
                border: "4px solid #1F5D4C",
                boxShadow: "0 0 0 3px rgba(255,255,255,0.8), 0 6px 18px rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
              title="Snap Meal"
            >
              <div style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: "var(--brand)"
              }} />
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.65)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#FFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
              title="Switch Camera"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ScanLog({ addMeal, remaining, subtab: parentSubtab, setSubtab: parentSetSubtab }) {
  const [localSubtab, setLocalSubtab] = useState("scan"); // scan | voice | barcode | search
  const subtab = parentSubtab || localSubtab;
  const setSubtab = parentSetSubtab || setLocalSubtab;

  const [step, setStep] = useState("idle"); // idle | loading | review
  const [previewUrl, setPreviewUrl] = useState(null);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [scanNotice, setScanNotice] = useState(null);
  const [aiMealHint, setAiMealHint] = useState("");
  const [isCalculatingHint, setIsCalculatingHint] = useState(false);
  const fileRef = useRef(null);

  const handleAiHintCalculate = async () => {
    if (!aiMealHint.trim()) return;
    setIsCalculatingHint(true);
    try {
      const parsed = await parseSpokenMeal(aiMealHint.trim());
      if (parsed && parsed.length > 0) {
        setItems(parsed.map((it, i) => {
          const q = Number(it.qty);
          const safeQty = (!isNaN(q) && q > 0) ? q : 1;
          return {
            id: i,
            name: it.name || "Meal Item",
            qty: safeQty,
            baseQty: safeQty,
            unit: it.unit || (safeQty > 1 ? "items" : "serving"),
            calories: Math.round(Number(it.calories) || 0),
            protein: Math.round((Number(it.protein) || 0) * 10) / 10,
            carbs: Math.round((Number(it.carbs) || 0) * 10) / 10,
            fat: Math.round((Number(it.fat) || 0) * 10) / 10,
            fiber: Math.round((Number(it.fiber) || 0) * 10) / 10,
            checked: true,
            photoUrl: previewUrl,
          };
        }));
        setScanNotice(null);
        setAiMealHint("");
        setStep("review");
      } else {
        setScanNotice("❌ Could not parse meal description. Please try with details like '2 boiled eggs'.");
      }
    } catch (err) {
      setScanNotice("❌ AI calculation failed: " + (err.message || "Network error"));
    } finally {
      setIsCalculatingHint(false);
    }
  };

  async function processBase64(base64Data, mimeType = "image/jpeg") {
    setScanNotice(null);
    const compressed = await compressImageBase64(base64Data);
    setPreviewUrl(compressed);
    setStep("loading");

    // Upload to Cloudinary in parallel without delaying Gemini Vision
    let cloudUrl = null;
    const cloudPromise = uploadImageToCloudinary(compressed)
      .then((url) => {
        cloudUrl = url;
        if (url) setPreviewUrl(url);
      })
      .catch((cErr) => console.warn("Cloudinary note:", cErr.message));

    try {
      const detected = await analyzeFoodImage(compressed, mimeType || "image/jpeg");
      // Allow fast Cloudinary promise a brief moment
      await Promise.race([cloudPromise, new Promise((r) => setTimeout(r, 1000))]);

      if (detected && detected.length > 0) {
        setItems(detected.map((it, i) => {
          const q = Number(it.qty);
          const safeQty = (!isNaN(q) && q > 0) ? q : 1;
          return {
            id: i,
            name: it.name || "Detected Food",
            qty: safeQty,
            baseQty: safeQty,
            unit: it.unit || (safeQty > 1 ? "items" : "serving"),
            calories: Math.round(Number(it.calories) || 0),
            protein: Math.round((Number(it.protein) || 0) * 10) / 10,
            carbs: Math.round((Number(it.carbs) || 0) * 10) / 10,
            fat: Math.round((Number(it.fat) || 0) * 10) / 10,
            fiber: Math.round((Number(it.fiber) || 0) * 10) / 10,
            checked: true,
            photoUrl: cloudUrl || compressed,
          };
        }));
        setStep("review");
      } else {
        setScanNotice("❌ Food not detected in photo. Tell AI what this meal was & let Gemini calculate exact macros:");
        setStep("idle");
      }
    } catch (err) {
      console.error("JazzCoach Vision scan failed:", err);
      setScanNotice("❌ Food scan failed (" + (err.message || "Analysis error") + "). Tell AI what this meal was & let Gemini calculate exact macros:");
      setStep("idle");
    }
  }

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      processBase64(event.target.result, file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  }

  function handleVoiceParsed(parsed) {
    setPreviewUrl(null);
    setItems(parsed.map((it, i) => {
      const q = Number(it.qty);
      const safeQty = (!isNaN(q) && q > 0) ? q : 1;
      return {
        id: i,
        name: it.name || "Spoken Food",
        qty: safeQty,
        baseQty: safeQty,
        unit: it.unit || (safeQty > 1 ? "items" : "serving"),
        calories: Math.round(Number(it.calories) || 0),
        protein: Math.round((Number(it.protein) || 0) * 10) / 10,
        carbs: Math.round((Number(it.carbs) || 0) * 10) / 10,
        fat: Math.round((Number(it.fat) || 0) * 10) / 10,
        fiber: Math.round((Number(it.fiber) || 0) * 10) / 10,
        checked: true,
      };
    }));
    setStep("review");
  }

  function updateQty(id, delta) {
    setItems((prev) => prev.map((it) => {
      if (it.id !== id) return it;
      const isCountBased = ["eggs", "egg", "pcs", "piece", "pieces", "slices", "slice", "items", "servings", "serving"].includes(String(it.unit).toLowerCase());
      const minVal = isCountBased ? 0.5 : (it.unit === "g" ? 10 : 0.25);
      const stepDelta = delta !== undefined ? delta : (isCountBased ? 1 : (it.unit === "g" ? 25 : 0.5));
      const newQty = Math.max(minVal, it.qty + stepDelta);
      return { ...it, qty: Math.round(newQty * 10) / 10 };
    }));
  }

  function toggleItem(id) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it)));
  }

  function confirmSave() {
    items.filter((i) => i.checked).forEach((it) => {
      const scale = it.baseQty > 0 ? (it.qty / it.baseQty) : 1;
      const unitStr = ["g", "ml"].includes(it.unit) ? `${it.qty}${it.unit}` : `${it.qty} ${it.unit}`;
      addMeal({
        name: `${it.name} (${unitStr})`,
        calories: Math.round(it.calories * scale),
        protein: Math.round(it.protein * scale * 10) / 10,
        carbs: Math.round(it.carbs * scale * 10) / 10,
        fat: Math.round(it.fat * scale * 10) / 10,
        fiber: Math.round(it.fiber * scale * 10) / 10,
        photoUrl: it.photoUrl || null,
      });
    });
    setStep("idle"); setItems([]); setPreviewUrl(null);
  }

  const itemTotals = items.filter((i) => i.checked).reduce((a, it) => {
    const scale = it.baseQty > 0 ? (it.qty / it.baseQty) : 1;
    return {
      calories: a.calories + it.calories * scale,
      protein: a.protein + it.protein * scale,
      carbs: a.carbs + it.carbs * scale,
      fat: a.fat + it.fat * scale,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return (
    <>
      <div className="np-h1" style={{ marginTop: 16 }}>Smart Food Log</div>
      <div className="np-sub">Photo vision, voice speech, barcode, or manual search</div>

      {scanNotice && (
        <div style={{
          background: "#2A1815",
          border: "1px solid #FF6B47",
          color: "#FFA896",
          borderRadius: 14,
          padding: "14px 16px",
          marginTop: 12,
          fontSize: 13,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span>{scanNotice}</span>
            <button
              type="button"
              onClick={() => setScanNotice(null)}
              style={{ background: "none", border: "none", color: "#FFA896", cursor: "pointer", display: "flex" }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
            <input
              type="text"
              placeholder="E.g. 2 whole boiled eggs, 1 scoop whey"
              value={aiMealHint}
              onChange={(e) => setAiMealHint(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAiHintCalculate(); }}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #FF6B47",
                background: "#1E1210",
                color: "#FFF",
                fontSize: 12.5
              }}
            />
            <button
              type="button"
              disabled={isCalculatingHint}
              onClick={handleAiHintCalculate}
              className="np-btn np-btn-accent"
              style={{ padding: "8px 14px", fontSize: 12, whiteSpace: "nowrap" }}
            >
              {isCalculatingHint ? "Calculating..." : "⚡ Calculate with AI"}
            </button>
          </div>
        </div>
      )}

      {step === "idle" && (
        <div className="np-subtabs-row">
          <button className={`np-subtab-btn ${subtab === "scan" ? "active" : ""}`} onClick={() => setSubtab("scan")}>
            <Camera size={14} /> Camera
          </button>
          <button className={`np-subtab-btn ${subtab === "voice" ? "active" : ""}`} onClick={() => setSubtab("voice")}>
            <Mic size={14} /> Voice AI
          </button>
          <button className={`np-subtab-btn ${subtab === "barcode" ? "active" : ""}`} onClick={() => setSubtab("barcode")}>
            <Barcode size={14} /> Barcode
          </button>
          <button className={`np-subtab-btn ${subtab === "search" ? "active" : ""}`} onClick={() => setSubtab("search")}>
            <Search size={14} /> Food Search
          </button>
        </div>
      )}

      {step === "idle" && subtab === "voice" && (
        <VoiceLog onItemsParsed={handleVoiceParsed} />
      )}

      {step === "idle" && subtab === "barcode" && (
        <BarcodeLog onAddMeal={addMeal} remaining={remaining} />
      )}

      {step === "idle" && subtab === "search" && (
        <FoodSearch query={query} setQuery={setQuery} addMeal={addMeal} remaining={remaining} />
      )}

      {step === "idle" && subtab === "scan" && (
        <>
          {showLiveCamera ? (
            <div style={{ marginBottom: 14 }}>
              <LiveCameraView
                onCapture={(dataUrl) => {
                  setShowLiveCamera(false);
                  processBase64(dataUrl, "image/jpeg");
                }}
                onClose={() => setShowLiveCamera(false)}
              />
            </div>
          ) : (
            <div className="np-drop">
              <div className="np-drop-ico"><Camera size={24} /></div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Snap or upload a meal photo</div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 14 }}>JPG or PNG &mdash; Instant photo analysis with JazzCoach AI</div>

              {/* Hidden file uploader for photo gallery */}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />

              <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "center" }}>
                <button
                  type="button"
                  className="np-btn np-btn-accent"
                  style={{ flex: 1, padding: "12px 14px", justifyContent: "center" }}
                  onClick={() => setShowLiveCamera(true)}
                >
                  <Camera size={16} /> Live AI Camera
                </button>
                <button
                  type="button"
                  className="np-btn np-btn-ghost"
                  style={{ flex: 1, padding: "12px 14px", justifyContent: "center" }}
                  onClick={() => fileRef.current && fileRef.current.click()}
                >
                  <Upload size={16} /> Choose Photo
                </button>
              </div>

              {/* 1-Tap Sample Meals to easily test */}
              <div style={{ marginTop: 18, width: "100%", borderTop: "1px dashed var(--line)", paddingTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--ink-faint)", marginBottom: 10, textAlign: "center" }}>
                  Or test AI with sample meals
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {SAMPLE_TEST_MEALS.map((sm, idx) => (
                    <button
                      key={idx}
                      type="button"
                      style={{
                        margin: 0,
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        borderRadius: 12,
                        border: "1px solid var(--line)",
                        background: "var(--surface)",
                        textAlign: "left",
                        transition: "transform 0.1s ease"
                      }}
                      onClick={() => {
                        setPreviewUrl(null);
                        setItems(sm.items.map((it, i) => ({ ...it, id: i, baseQty: it.qty, checked: true })));
                        setStep("review");
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{sm.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 11.5, color: "var(--ink)" }}>{sm.title}</div>
                        <div style={{ fontSize: 10.5, color: "var(--brand)", fontWeight: 600 }}>{sm.kcal} kcal • {sm.p}g P</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="np-card" style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", background: "var(--brand-soft)", border: "1px solid #C4DCD3", padding: "10px 14px" }}>
            <Sparkles size={15} style={{ flexShrink: 0, color: "var(--brand)" }} />
            <div style={{ fontSize: 12.5, color: "var(--brand)", fontWeight: 700 }}>
              Powered by JazzCoach Vision AI (Gemini 3.5 &amp; Flash)
            </div>
          </div>
        </>
      )}

      {step === "loading" && (
        <div className="np-card" style={{ textAlign: "center", padding: 30 }}>
          {previewUrl && <div className="np-scan-preview" style={{ marginBottom: 16 }}><img src={previewUrl} alt="meal" /></div>}
          <div style={{ fontWeight: 700, fontSize: 14 }}>Analyzing your meal with JazzCoach AI&hellip;</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4 }}>Estimating portion sizes and macros</div>
          <div className="np-loading-bar"><div className="np-loading-fill" /></div>
        </div>
      )}

      {step === "review" && (
        <>
          {previewUrl && <div className="np-scan-preview"><img src={previewUrl} alt="meal" /></div>}
          <div className="np-sub" style={{ marginBottom: 10 }}>Review detected items — adjust portions or remove before saving</div>
          {items.map((it) => {
            const scale = it.baseQty > 0 ? (it.qty / it.baseQty) : 1;
            const isCount = ["eggs", "egg", "pcs", "piece", "pieces", "slices", "slice", "items"].includes(String(it.unit).toLowerCase());
            return (
              <div className="np-item-card" key={it.id} style={{ opacity: it.checked ? 1 : 0.45 }}>
                <div className="np-item-top">
                  <div className="np-item-name">{it.name}</div>
                  <button onClick={() => toggleItem(it.id)} style={{ background: "none", border: "none", cursor: "pointer", color: it.checked ? "var(--fat)" : "var(--ink-faint)" }}>
                    {it.checked ? <Check size={18} /> : <Plus size={18} />}
                  </button>
                </div>
                <div className="np-stepper">
                  <button onClick={() => updateQty(it.id, isCount ? -1 : (it.unit === "g" ? -25 : -0.5))}>&minus;</button>
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 70, textAlign: "center" }}>{it.qty} {it.unit}</span>
                  <button onClick={() => updateQty(it.id, isCount ? 1 : (it.unit === "g" ? 25 : 0.5))}>+</button>
                  <span style={{ marginLeft: "auto", fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 15 }}>{Math.round(it.calories * scale)} kcal</span>
                </div>
                <div className="np-macro-tags">
                  <span className="np-tag" style={{ background: "var(--protein-soft)", color: "var(--protein)" }}>P {Math.round(it.protein * scale * 10) / 10}g</span>
                  <span className="np-tag" style={{ background: "var(--carbs-soft)", color: "#A9701C" }}>C {Math.round(it.carbs * scale * 10) / 10}g</span>
                  <span className="np-tag" style={{ background: "var(--fat-soft)", color: "var(--fat)" }}>F {Math.round(it.fat * scale * 10) / 10}g</span>
                  {it.fiber > 0 && (
                    <span className="np-tag" style={{ background: "#EFE8FA", color: "var(--fiber)" }}>Fiber {Math.round(it.fiber * scale * 10) / 10}g</span>
                  )}
                </div>
              </div>
            );
          })}
          <div className="np-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", fontWeight: 700, textTransform: "uppercase" }}>Meal total</div>
              <div style={{ fontFamily: "'Oswald',sans-serif", fontSize: 22, fontWeight: 600 }}>{Math.round(itemTotals.calories)} kcal</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", textAlign: "right" }}>
              P {Math.round(itemTotals.protein)}g &middot; C {Math.round(itemTotals.carbs)}g &middot; F {Math.round(itemTotals.fat)}g
            </div>
          </div>
          <div className="np-row-btns">
            <button className="np-btn np-btn-ghost" style={{ flex: 1 }} onClick={() => { setStep("idle"); setItems([]); setPreviewUrl(null); }}>Discard</button>
            <button className="np-btn np-btn-accent" style={{ flex: 2 }} onClick={confirmSave}><Check size={16} /> Save to log</button>
          </div>
        </>
      )}
    </>
  );
}

function FoodSearch({ query, setQuery, addMeal, remaining }) {
  const [picked, setPicked] = useState(null);
  const [servings, setServings] = useState(1);
  const [isEditingPicked, setIsEditingPicked] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customError, setCustomError] = useState(null);
  const [customCals, setCustomCals] = useState("");
  const [customP, setCustomP] = useState("");
  const [customC, setCustomC] = useState("");
  const [customF, setCustomF] = useState("");
  const [customFib, setCustomFib] = useState("");

  const [customFoods, setCustomFoods] = useState(() => {
    try {
      const stored = localStorage.getItem("jazz_custom_foods");
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const [apiResults, setApiResults] = useState([]);
  const [loadingApi, setLoadingApi] = useState(false);

  const saveCustomFood = (food) => {
    const updated = [food, ...customFoods.filter((f) => f.name.toLowerCase() !== food.name.toLowerCase())];
    setCustomFoods(updated);
    try {
      localStorage.setItem("jazz_custom_foods", JSON.stringify(updated));
    } catch (e) {}
  };

  const deleteCustomFood = (name, e) => {
    e?.stopPropagation();
    const updated = customFoods.filter((f) => f.name !== name);
    setCustomFoods(updated);
    try {
      localStorage.setItem("jazz_custom_foods", JSON.stringify(updated));
    } catch (e) {}
  };

  const handleCreateCustom = (andLog = true) => {
    if (!customName.trim()) {
      setCustomError("Please enter a food or recipe name.");
      return;
    }
    setCustomError(null);
    const cals = Number(customCals) || 0;
    const p = Number(customP) || 0;
    const c = Number(customC) || 0;
    const f = Number(customF) || 0;
    const fib = Number(customFib) || 0;

    const newFood = {
      name: customName.trim(),
      calories: Math.round(cals),
      protein: Math.round(p * 10) / 10,
      carbs: Math.round(c * 10) / 10,
      fat: Math.round(f * 10) / 10,
      fiber: Math.round(fib * 10) / 10,
      isCustom: true,
    };

    saveCustomFood(newFood);
    if (andLog) {
      addMeal(newFood);
    }

    setCustomName("");
    setCustomCals("");
    setCustomP("");
    setCustomC("");
    setCustomF("");
    setCustomFib("");
    setShowAddCustom(false);
  };

  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setApiResults([]);
      setLoadingApi(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingApi(true);
      try {
        const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=8`);
        const data = await res.json();
        if (data && data.products) {
          const mapped = data.products
            .filter((p) => (p.product_name || p.generic_name) && p.nutriments)
            .map((p) => {
              const name = (p.product_name || p.generic_name) + (p.brands ? ` (${p.brands.split(',')[0].trim()})` : "");
              const cals = Math.round(Number(p.nutriments["energy-kcal_100g"] || p.nutriments["energy-kcal_serving"] || 0));
              const protein = Math.round((Number(p.nutriments["proteins_100g"] || p.nutriments["proteins_serving"] || 0)) * 10) / 10;
              const carbs = Math.round((Number(p.nutriments["carbohydrates_100g"] || p.nutriments["carbohydrates_serving"] || 0)) * 10) / 10;
              const fat = Math.round((Number(p.nutriments["fat_100g"] || p.nutriments["fat_serving"] || 0)) * 10) / 10;
              const fiber = Math.round((Number(p.nutriments["fiber_100g"] || p.nutriments["fiber_serving"] || 0)) * 10) / 10;
              return { name, calories: cals, protein, carbs, fat, fiber, isLive: true };
            })
            .filter((p) => p.calories > 0);
          setApiResults(mapped);
        }
      } catch (err) {
        console.warn("Live API food search error:", err);
      } finally {
        setLoadingApi(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const combinedLocal = [...customFoods, ...FOOD_DB];
  const localResults = query ? combinedLocal.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())) : combinedLocal;
  const allResults = query
    ? [...localResults, ...apiResults.filter((ar) => !localResults.some((lr) => lr.name.toLowerCase() === ar.name.toLowerCase()))]
    : combinedLocal;

  const handlePick = (f) => {
    setPicked(f);
    setServings(1);
    setIsEditingPicked(false);
    setEditForm({
      name: f.name,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      fiber: f.fiber || 0,
    });
  };

  if (picked) {
    const scale = servings;
    const activeName = isEditingPicked ? editForm.name : picked.name;
    const activeCals = Math.round((isEditingPicked ? editForm.calories : picked.calories) * scale);
    const activeP = Math.round((isEditingPicked ? editForm.protein : picked.protein) * scale * 10) / 10;
    const activeC = Math.round((isEditingPicked ? editForm.carbs : picked.carbs) * scale * 10) / 10;
    const activeF = Math.round((isEditingPicked ? editForm.fat : picked.fat) * scale * 10) / 10;
    const activeFib = Math.round((isEditingPicked ? editForm.fiber : (picked.fiber || 0)) * scale * 10) / 10;

    return (
      <div className="np-item-card">
        <div className="np-item-top">
          <div>
            <div className="np-item-name">{activeName}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
              {picked.isLive ? "OpenFoodFacts live verified" : picked.isCustom ? "Saved Custom Food" : "Open-source Indian staple"}
            </div>
          </div>
          <button onClick={() => setPicked(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
        </div>

        <div className="np-stepper">
          <button onClick={() => setServings((s) => Math.max(0.5, s - 0.5))}>&minus;</button>
          <span style={{ fontWeight: 700, fontSize: 13, minWidth: 90, textAlign: "center" }}>{servings} serving{servings !== 1 ? "s" : ""}</span>
          <button onClick={() => setServings((s) => s + 0.5)}>+</button>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16 }}>{activeCals} kcal</span>
        </div>

        <div className="np-macro-tags" style={{ marginBottom: 10 }}>
          <span className="np-tag" style={{ background: "var(--protein-soft)", color: "var(--protein)" }}>P {activeP}g</span>
          <span className="np-tag" style={{ background: "var(--carbs-soft)", color: "#A9701C" }}>C {activeC}g</span>
          <span className="np-tag" style={{ background: "var(--fat-soft)", color: "var(--fat)" }}>F {activeF}g</span>
          <span className="np-tag" style={{ background: "#EFE8FA", color: "var(--fiber)" }}>Fiber {activeFib}g</span>
        </div>

        <button
          className="np-btn np-btn-ghost np-btn-sm"
          style={{ width: "100%", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12 }}
          onClick={() => setIsEditingPicked(!isEditingPicked)}
        >
          <Pencil size={13} /> {isEditingPicked ? "Close Macro Customizer" : "Customize Portion / Macros"}
        </button>

        {isEditingPicked && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 8 }}>EDIT FOOD DETAILS</div>
            <input
              style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", marginBottom: 8, fontSize: 13 }}
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Food Name"
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--ink-soft)" }}>Calories (kcal)</label>
                <input
                  type="number"
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12 }}
                  value={editForm.calories}
                  onChange={(e) => setEditForm({ ...editForm, calories: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--protein)" }}>Protein (g)</label>
                <input
                  type="number"
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12 }}
                  value={editForm.protein}
                  onChange={(e) => setEditForm({ ...editForm, protein: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#A9701C" }}>Carbs (g)</label>
                <input
                  type="number"
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12 }}
                  value={editForm.carbs}
                  onChange={(e) => setEditForm({ ...editForm, carbs: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--fat)" }}>Fat (g)</label>
                <input
                  type="number"
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12 }}
                  value={editForm.fat}
                  onChange={(e) => setEditForm({ ...editForm, fat: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        )}

        <button
          className="np-btn np-btn-accent" style={{ width: "100%" }}
          onClick={() => {
            const finalMeal = {
              name: `${activeName}${servings !== 1 ? ` x${servings}` : ""}`,
              calories: activeCals,
              protein: activeP,
              carbs: activeC,
              fat: activeF,
              fiber: activeFib,
            };
            addMeal(finalMeal);
            if (isEditingPicked) {
              saveCustomFood({
                name: activeName,
                calories: Math.round(isEditingPicked ? editForm.calories : picked.calories),
                protein: activeP / scale,
                carbs: activeC / scale,
                fat: activeF / scale,
                fiber: activeFib / scale,
                isCustom: true,
              });
            }
            setPicked(null); setServings(1); setQuery("");
          }}
        >
          <Check size={16} /> Add to Today's Log
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="np-search-bar">
        <Search size={16} color="var(--ink-faint)" />
        <input placeholder="Search Indian dishes, dals, roti, or 3M+ global foods" value={query} onChange={(e) => setQuery(e.target.value)} />
        {loadingApi && <RefreshCw size={14} className="spin" style={{ color: "var(--brand)", animation: "spin 1s linear infinite" }} />}
      </div>

      {query.trim().length > 1 && (
        <button
          type="button"
          disabled={loadingApi}
          onClick={async () => {
            setLoadingApi(true);
            try {
              const parsed = await parseSpokenMeal(query.trim());
              if (parsed && parsed.length > 0) {
                const first = parsed[0];
                handlePick({
                  name: first.name,
                  calories: Math.round(Number(first.calories) || 0),
                  protein: Math.round((Number(first.protein) || 0) * 10) / 10,
                  carbs: Math.round((Number(first.carbs) || 0) * 10) / 10,
                  fat: Math.round((Number(first.fat) || 0) * 10) / 10,
                  fiber: Math.round((Number(first.fiber) || 0) * 10) / 10,
                  isLive: false,
                  isCustom: true,
                });
              }
            } catch (e) {
              console.error("AI calculate failed:", e);
            } finally {
              setLoadingApi(false);
            }
          }}
          className="np-card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            marginBottom: 12,
            background: "linear-gradient(135deg, rgba(29, 185, 84, 0.12), rgba(0, 168, 150, 0.06))",
            border: "1.5px solid var(--brand)",
            borderRadius: 14,
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
            transition: "transform 0.15s ease",
          }}
        >
          <Sparkles size={20} style={{ color: "var(--brand)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>
              ⚡ Calculate &ldquo;{query}&rdquo; with Gemini AI
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
              Instant exact calories, protein, carbs &amp; fat calculated by LLM
            </div>
          </div>
        </button>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          className="np-btn np-btn-ghost np-btn-sm"
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "8px 12px" }}
          onClick={() => setShowAddCustom(!showAddCustom)}
        >
          <Plus size={14} /> {showAddCustom ? "Cancel Custom Food" : "+ Add Custom Indian Food / Recipe"}
        </button>
      </div>

      {showAddCustom && (
        <div className="np-card" style={{ marginBottom: 12, border: "1.5px solid var(--brand)", background: "var(--surface)" }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={14} color="var(--brand)" /> Add Custom Food / Home Recipe
          </div>
          {customError && (
            <div style={{ background: "#FEE2E2", color: "#991B1B", border: "1px solid #FCA5A5", borderRadius: 8, padding: "6px 10px", fontSize: 12, marginBottom: 8 }}>
              {customError}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input
              placeholder="Food name (e.g. 2 Boiled Eggs, Paneer Paratha)"
              style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13 }}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <button
              type="button"
              className="np-btn np-btn-ghost np-btn-sm"
              style={{ whiteSpace: "nowrap", padding: "8px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
              onClick={async () => {
                if (!customName.trim()) {
                  setCustomError("Enter a food name first to auto-calculate.");
                  return;
                }
                setCustomError(null);
                try {
                  const parsed = await parseSpokenMeal(customName.trim());
                  if (parsed && parsed.length > 0) {
                    const item = parsed[0];
                    setCustomCals(String(Math.round(item.calories || 0)));
                    setCustomP(String(Math.round((item.protein || 0) * 10) / 10));
                    setCustomC(String(Math.round((item.carbs || 0) * 10) / 10));
                    setCustomF(String(Math.round((item.fat || 0) * 10) / 10));
                    setCustomFib(String(Math.round((item.fiber || 0) * 10) / 10));
                  }
                } catch (e) {
                  setCustomError("AI could not calculate: " + (e.message || "Failed"));
                }
              }}
            >
              <Sparkles size={13} color="var(--brand)" /> Auto-Fill
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--ink-soft)" }}>Calories (kcal)</label>
              <input
                type="number"
                placeholder="e.g. 240"
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12 }}
                value={customCals}
                onChange={(e) => setCustomCals(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--protein)" }}>Protein (g)</label>
              <input
                type="number"
                placeholder="e.g. 14"
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12 }}
                value={customP}
                onChange={(e) => setCustomP(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#A9701C" }}>Carbs (g)</label>
              <input
                type="number"
                placeholder="e.g. 28"
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12 }}
                value={customC}
                onChange={(e) => setCustomC(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--fat)" }}>Fat (g)</label>
              <input
                type="number"
                placeholder="e.g. 6"
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12 }}
                value={customF}
                onChange={(e) => setCustomF(e.target.value)}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="np-btn np-btn-accent np-btn-sm"
              style={{ flex: 1 }}
              onClick={() => handleCreateCustom(true)}
            >
              <Check size={14} /> Log Now & Save
            </button>
            <button
              className="np-btn np-btn-ghost np-btn-sm"
              style={{ flex: 1 }}
              onClick={() => handleCreateCustom(false)}
            >
              Save to My Foods
            </button>
          </div>
        </div>
      )}

      {customFoods.length > 0 && !query && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", marginBottom: 6 }}>
            My Custom Foods ({customFoods.length})
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {customFoods.map((cf) => (
              <div
                key={cf.name}
                className="np-chip"
                style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", background: "var(--brand-soft)", color: "var(--brand)", border: "1px solid #C4DCD3" }}
                onClick={() => handlePick(cf)}
              >
                <span>{cf.name}</span>
                <span style={{ fontSize: 10, opacity: 0.8 }}>({cf.calories} kcal)</span>
                <button
                  onClick={(e) => deleteCustomFood(cf.name, e)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", padding: 0 }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {remaining.protein > 20 && (
        <div className="np-card" style={{ background: "var(--protein-soft)", border: "none", padding: 12, fontSize: 12.5, color: "#1F3E8C" }}>
          You're {remaining.protein}g short on protein today — tap any high-protein dal, paneer, or chicken staple below!
        </div>
      )}

      <div className="np-card">
        {allResults.length === 0 && !loadingApi && (
          <div className="np-empty">No matches found &mdash; try another keyword or tap "+ Add Custom Indian Food" above.</div>
        )}
        {allResults.map((f, i) => (
          <div className="np-food-result" key={`${f.name}-${i}`} onClick={() => handlePick(f)}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                {f.name}
                {f.isCustom && <span style={{ fontSize: 9.5, background: "var(--brand-soft)", color: "var(--brand)", padding: "1px 5px", borderRadius: 6, fontWeight: 700 }}>CUSTOM</span>}
                {f.isLive && <span style={{ fontSize: 9.5, background: "#E8F0FE", color: "#1967D2", padding: "1px 5px", borderRadius: 6, fontWeight: 700 }}>LIVE</span>}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>P{f.protein}g &middot; C{f.carbs}g &middot; F{f.fat}g</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>{f.calories}</span>
              <ChevronRight size={15} color="var(--ink-faint)" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------- */
/* AI SUGGESTIONS                                                          */
/* ---------------------------------------------------------------------- */
function pickSuggestionFoods(remaining) {
  // Diverse authentic Indian fitness staples (no repetitive whey or egg whites)
  const goodFoods = FOOD_DB.filter(
    (f) => f.calories <= Math.max(remaining.calories, 280) &&
           f.protein >= 10 &&
           !f.name.toLowerCase().includes("whey") &&
           !f.name.toLowerCase().includes("egg whites")
  );
  if (goodFoods.length < 2) return FOOD_DB.slice(0, 2);
  return [goodFoods[0], goodFoods[Math.min(goodFoods.length - 1, 3)]];
}

function buildSuggestionText(remaining, totals) {
  if (!totals || totals.calories === 0) {
    return `Welcome to your day! You have a fresh target of ${remaining.calories} kcal and ${remaining.protein}g protein. Kick off your morning with 2 Besan Chillas with curd, Paneer Bhurji with multigrain toast, or 3 boiled eggs to build early momentum!`;
  }
  const picks = pickSuggestionFoods(remaining);
  const names = picks.map((p) => p.name.replace(/\s*\(.*\)/, "")).join(" or ");
  if (remaining.protein <= 5) {
    return `Crushing it today — your protein target is locked in! You still have ${remaining.calories} kcal left. Keep it clean: a fresh apple, papaya slices, or a chilled spiced chaas will round out your day cleanly.`;
  }
  return `You're ${remaining.protein}g short on protein with ${remaining.calories} kcal left in the tank. Hit your target with ${names || "200g Paneer Tikka, Tandoori Chicken, or Soya Chunks Curry with 1 multigrain roti"}!`;
}

/* ---------------------------------------------------------------------- */
/* CLEAN AI TEXT FORMATTING HELPERS                                       */
/* ---------------------------------------------------------------------- */
function renderInlineFormatting(str) {
  if (!str || typeof str !== "string") return str || "";
  const parts = [];
  const regex = /\*\*(.*?)\*\*|\*([^*]+)\*/g;
  let lastIdx = 0;
  let match;
  let count = 0;
  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      const plain = str.substring(lastIdx, match.index).replace(/[*_`]/g, "");
      if (plain) parts.push(plain);
    }
    const boldText = (match[1] || match[2] || "").replace(/[*_`]/g, "");
    if (boldText) {
      parts.push(
        <strong key={`b-${count++}`} style={{ fontWeight: 700, color: "var(--ink)" }}>
          {boldText}
        </strong>
      );
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < str.length) {
    const plain = str.substring(lastIdx).replace(/[*_`]/g, "");
    if (plain) parts.push(plain);
  }
  return parts.length > 0 ? parts : str.replace(/[*_`]/g, "");
}

function CleanAIMessage({ text }) {
  if (!text) return null;

  // Pre-process text: normalize bullet points and fix inline collisions like "budget. * **To make it fit:**"
  let clean = String(text)
    .replace(/\r\n/g, "\n")
    .replace(/([^\n])\s*(?:[*•-]|(?:\d+\.))\s+\*\*/g, "$1\n\n• **")
    .replace(/([^\n])\s*(?:[*•-])\s+([A-Z])/g, "$1\n\n• $2")
    .replace(/^\s*[*•-]\s+/gm, "• ");

  const blocks = clean.split(/\n+/).map((b) => b.trim()).filter(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {blocks.map((block, idx) => {
        // Bullet with bold heading: e.g. • **Heading:** body
        const bulletMatch = block.match(/^(?:•|\d+\.)\s*(?:\*\*(.*?)\*\*:?|\*([^*]+)\*:?)\s*(.*)$/);
        if (bulletMatch) {
          const title = (bulletMatch[1] || bulletMatch[2] || "").trim();
          const body = bulletMatch[3] ? bulletMatch[3].trim() : "";
          return (
            <div key={idx} className="np-ai-bullet-item">
              <div className="np-ai-bullet-header">
                <span className="np-ai-bullet-dot" />
                <span>{title}</span>
              </div>
              {body && <div className="np-ai-bullet-body">{renderInlineFormatting(body)}</div>}
            </div>
          );
        }

        // Simple bullet: • body
        const simpleBullet = block.match(/^(?:•|\d+\.)\s*(.*)$/);
        if (simpleBullet) {
          return (
            <div key={idx} className="np-ai-bullet-simple">
              <span className="np-ai-bullet-dot" style={{ marginTop: 6 }} />
              <div style={{ flex: 1 }}>{renderInlineFormatting(simpleBullet[1])}</div>
            </div>
          );
        }

        // Standout lead header: **Lead Statement!**
        const leadMatch = block.match(/^\*\*(.*?)\*\*\s*(.*)$/);
        if (leadMatch) {
          const lead = leadMatch[1];
          const rest = leadMatch[2];
          return (
            <div key={idx} style={{ marginBottom: rest ? 6 : 0 }}>
              <div className="np-ai-lead-banner">{lead}</div>
              {rest && <div className="np-ai-para">{renderInlineFormatting(rest)}</div>}
            </div>
          );
        }

        // Standard paragraph
        return (
          <div key={idx} className="np-ai-para">
            {renderInlineFormatting(block)}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* SMART SWAPS ENGINE                                                     */
/* ---------------------------------------------------------------------- */
function SmartSwapsSection({ meals = [], addMeal, remaining, totals, goals }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [customInput, setCustomInput] = useState("");
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customSwap, setCustomSwap] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Check if user logged any foods matching items in our database today
  const detectedSwaps = useMemo(() => {
    if (!meals || meals.length === 0) return [];
    const found = [];
    for (const item of SMART_SWAP_DATABASE) {
      const matchedMeal = meals.find((m) =>
        item.keywords.some((k) => (m.name || "").toLowerCase().includes(k))
      );
      if (matchedMeal && !found.some((f) => f.item.id === item.id)) {
        found.push({ item, loggedMeal: matchedMeal });
      }
    }
    return found;
  }, [meals]);

  const categories = [
    { id: "all", label: "All Swaps" },
    { id: "fastfood", label: "🍕 Fast Food" },
    { id: "snacks", label: "🥟 Snacks" },
    { id: "meals", label: "🍛 Curries & Rice" },
    { id: "breads", label: "🫓 Breads" },
    { id: "drinks", label: "☕ Drinks" },
    { id: "sweets", label: "🍨 Sweets" },
  ];

  const filteredItems = activeCategory === "all"
    ? SMART_SWAP_DATABASE
    : SMART_SWAP_DATABASE.filter((s) => s.category === activeCategory);

  const handleLogSwap = (swapItem) => {
    if (!addMeal) return;
    addMeal({
      name: swapItem.name,
      calories: swapItem.calories,
      protein: swapItem.protein,
      carbs: swapItem.carbs,
      fat: swapItem.fat,
      fiber: swapItem.fiber || 0,
      timestamp: new Date().toISOString(),
    });
    setToastMsg(`Logged "${swapItem.name}" (${swapItem.calories} kcal, ${swapItem.protein}g protein) into today's log!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleFindCustomSwap = async (cravingText) => {
    const query = (cravingText || customInput).trim();
    if (!query || loadingCustom) return;
    setCustomInput(query);
    setLoadingCustom(true);
    setCustomSwap(null);
    try {
      const prompt = `Give a high-protein, calorie-saving healthy swap for this craving: "${query}".
Return ONLY a valid JSON object with NO markdown code fences and no extra text:
{
  "cravingName": "${query}",
  "cravingCalories": 650,
  "swapName": "Healthier Fitness Alternative",
  "swapCalories": 320,
  "swapProtein": 28,
  "swapCarbs": 35,
  "swapFat": 6,
  "swapFiber": 5,
  "calorieSavings": 330,
  "proteinGain": 16,
  "fatSaved": 24,
  "note": "1 concise sentence explaining the swap"
}`;
      const reply = await askDietitian(prompt, remaining, totals, meals, goals);
      const cleaned = reply.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setCustomSwap(parsed);
    } catch (err) {
      setCustomSwap({
        cravingName: query,
        cravingCalories: 580,
        swapName: `Air-Fried High-Protein ${query} (Paneer / Soya / Chicken)`,
        swapCalories: 290,
        swapProtein: 26,
        swapCarbs: 32,
        swapFat: 5,
        swapFiber: 6,
        calorieSavings: 290,
        proteinGain: 16,
        fatSaved: 21,
        note: "Eliminates deep-frying oil and triples muscle-building protein",
      });
    } finally {
      setLoadingCustom(false);
    }
  };

  return (
    <div className="np-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div className="np-card-title" style={{ margin: 0 }}>Smart swaps</div>
        <span style={{ fontSize: 11, color: "var(--ink-soft)", fontWeight: 600 }}>Real Macro Upgrades</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 12 }}>
        Cut hidden fat &amp; calories while keeping the flavors you crave. Tap <strong>+ Log</strong> to add directly into today!
      </div>

      {toastMsg && (
        <div style={{
          background: "#DCFCE7", border: "1.5px solid #86EFAC", color: "#166534",
          borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700,
          marginBottom: 12, display: "flex", alignItems: "center", gap: 6
        }}>
          <Check size={14} color="#166534" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Detected live swap alert if user logged a high calorie item today */}
      {detectedSwaps.length > 0 && (
        <div className="np-swap-alert" style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 12 }}>
          <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6, marginBottom: 3, color: "#92400E", fontSize: 12.5 }}>
            <Sparkles size={14} /> Detected in Today's Log: "{detectedSwaps[0].loggedMeal.name}"
          </div>
          <div style={{ fontSize: 11.5, lineHeight: 1.4, color: "#78350F" }}>
            Swap to <strong>{detectedSwaps[0].item.swap.name}</strong> next time to save {detectedSwaps[0].item.savings.calories} kcal and gain +{detectedSwaps[0].item.savings.proteinGain}g protein!
          </div>
          <button
            className="np-btn np-btn-accent np-btn-sm"
            style={{ marginTop: 8, fontSize: 11, padding: "4px 10px", borderRadius: 8 }}
            onClick={() => handleLogSwap(detectedSwaps[0].item.swap)}
          >
            <Plus size={13} /> Log Healthy Alternative ({detectedSwaps[0].item.swap.calories} kcal)
          </button>
        </div>
      )}

      {/* Category Chips */}
      <div className="np-swap-category-chips">
        {categories.map((c) => (
          <button
            key={c.id}
            className={`np-swap-chip ${activeCategory === c.id ? "active" : ""}`}
            onClick={() => setActiveCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Clean Compact Swaps List (As Before, Zero Mock Data) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredItems.map((item) => (
          <div key={item.id} className="np-swap-row">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 9, flex: 1, minWidth: 0 }}>
              <ArrowRight size={15} color="var(--accent)" style={{ flexShrink: 0, marginTop: 3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ textDecoration: "line-through", color: "var(--ink-soft)", fontSize: 12.5 }}>
                    {item.craving.name}
                  </span>
                  <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>&rarr;</span>
                  <strong style={{ color: "var(--ink)", fontSize: 13 }}>
                    {item.swap.name}
                  </strong>
                </div>

                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
                  <span className="np-swap-pill np-swap-pill-cal">
                    &minus;{item.savings.calories} kcal
                  </span>
                  {item.savings.proteinGain > 0 && (
                    <span className="np-swap-pill np-swap-pill-prot">
                      +{item.savings.proteinGain}g protein
                    </span>
                  )}
                  {item.savings.fatSaved > 0 && (
                    <span className="np-swap-pill np-swap-pill-fat">
                      &minus;{item.savings.fatSaved}g fat
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 4, lineHeight: 1.35 }}>
                  {item.swap.win || item.swap.recipeTip}
                </div>
              </div>
            </div>

            <button
              className="np-btn np-btn-accent np-btn-sm"
              style={{ flexShrink: 0, padding: "6px 10px", fontSize: 11, borderRadius: 8, whiteSpace: "nowrap" }}
              onClick={() => handleLogSwap(item.swap)}
              title="Add this healthy swap to today's log"
            >
              + Log ({item.swap.calories})
            </button>
          </div>
        ))}
      </div>

      {/* AI Custom Craving Swap Studio */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1.5px dashed var(--line)" }}>
        <div style={{ fontWeight: 700, fontSize: 12.5, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <Sparkles size={14} color="var(--accent)" /> Craving something else?
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 8 }}>
          Tap a craving or type any food to get an instant healthy macro swap:
        </div>

        {/* Quick Suggestion Pills */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
          <button className="np-chip" style={{ fontSize: 10.5, padding: "3px 8px" }} onClick={() => handleFindCustomSwap("Fried Momos")}>
            🥟 Momos
          </button>
          <button className="np-chip" style={{ fontSize: 10.5, padding: "3px 8px" }} onClick={() => handleFindCustomSwap("Double Cheeseburger")}>
            🍔 Burger
          </button>
          <button className="np-chip" style={{ fontSize: 10.5, padding: "3px 8px" }} onClick={() => handleFindCustomSwap("Chole Bhature")}>
            🥘 Chole Bhature
          </button>
          <button className="np-chip" style={{ fontSize: 10.5, padding: "3px 8px" }} onClick={() => handleFindCustomSwap("Chocolate Brownie")}>
            🍫 Brownie
          </button>
          <button className="np-chip" style={{ fontSize: 10.5, padding: "3px 8px" }} onClick={() => handleFindCustomSwap("French Fries")}>
            🍟 Fries
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleFindCustomSwap(customInput); }} style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input
            className="np-input"
            style={{ padding: "7px 10px", fontSize: 12 }}
            placeholder="Type craving (e.g. Shawarma, Vada Pav)..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            disabled={loadingCustom}
          />
          <button
            type="submit"
            className="np-btn np-btn-brand np-btn-sm"
            style={{ whiteSpace: "nowrap", padding: "7px 12px", fontSize: 11.5 }}
            disabled={loadingCustom || !customInput.trim()}
          >
            {loadingCustom ? "Finding..." : "Find Swap"}
          </button>
        </form>

        {/* Custom AI Swap Result in Same Sleek Row Style */}
        {customSwap && (
          <div className="np-swap-row" style={{ background: "#F0FDF4", borderColor: "#86EFAC", marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
              <Sparkles size={15} color="#166534" style={{ flexShrink: 0, marginTop: 3 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ textDecoration: "line-through", color: "#991B1B", fontSize: 12 }}>
                    {customSwap.cravingName} ({customSwap.cravingCalories || 550} kcal)
                  </span>
                  <span style={{ color: "var(--ink-faint)", fontSize: 12 }}>&rarr;</span>
                  <strong style={{ color: "#166534", fontSize: 13 }}>
                    {customSwap.swapName} ({customSwap.swapCalories || 290} kcal)
                  </strong>
                </div>

                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
                  <span className="np-swap-pill np-swap-pill-cal">
                    &minus;{customSwap.calorieSavings || 260} kcal
                  </span>
                  <span className="np-swap-pill np-swap-pill-prot">
                    +{customSwap.proteinGain || 15}g protein
                  </span>
                  <span className="np-swap-pill np-swap-pill-fat">
                    &minus;{customSwap.fatSaved || 18}g fat
                  </span>
                </div>

                <div style={{ fontSize: 11.5, color: "#14532D", marginTop: 4, lineHeight: 1.35 }}>
                  {customSwap.note || customSwap.reason || "High-protein alternative that cuts deep-fried oils."}
                </div>
              </div>
            </div>

            <button
              className="np-btn np-btn-sm"
              style={{ background: "#166534", color: "#fff", flexShrink: 0, padding: "6px 10px", fontSize: 11, borderRadius: 8, whiteSpace: "nowrap" }}
              onClick={() => handleLogSwap({
                name: customSwap.swapName,
                calories: customSwap.swapCalories || 290,
                protein: customSwap.swapProtein || 25,
                carbs: customSwap.swapCarbs || 30,
                fat: customSwap.swapFat || 6,
                fiber: customSwap.swapFiber || 4,
              })}
            >
              + Log ({customSwap.swapCalories || 290})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AISuggestions({ remaining, totals, goals = DEFAULT_GOALS, meals = [], addMeal, onOpenChat }) {
  const [aiRec, setAiRec] = useState(null);
  const [mealPlan, setMealPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    let active = true;
    getDailyRecommendation(remaining, totals)
      .then((rec) => {
        if (active && rec) setAiRec(rec);
      })
      .catch((err) => console.warn("JazzCoach recommendation fallback:", err));
    return () => { active = false; };
  }, [remaining.calories, remaining.protein, totals.calories]);

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    try {
      const plan = await askDietitian(
        "Generate a tailored Indian meal blueprint (Breakfast, Lunch, Dinner) matching my exact remaining macros.",
        remaining, totals, meals, goals
      );
      setMealPlan(plan);
    } catch (e) {
      setMealPlan("Power Blueprint:\n• Breakfast: 2 Besan Chillas + 100g Curd (20g P, 290 kcal)\n• Lunch: 150g Paneer or Tandoori Chicken + 1 Roti + Dal (36g P, 390 kcal)\n• Dinner: Soya Chunks Curry + Steamed Basmati Rice (30g P, 360 kcal)\n• Evening Snack: 30g Roasted Makhana + Spiced Chaas (5g P, 150 kcal)");
    } finally {
      setLoadingPlan(false);
    }
  };

  const text = aiRec || buildSuggestionText(remaining, totals);
  return (
    <>
      <div className="np-h1" style={{ marginTop: 16 }}>JazzCoach AI</div>
      <div className="np-sub">Personalized to what's left in your day</div>

      <div className="np-suggestion-card">
        <div className="np-suggestion-eyebrow"><Sparkles size={14} /> TODAY'S JAZZCOACH RECOMMENDATION</div>
        <div className="np-suggestion-text">{renderInlineFormatting(text)}</div>
      </div>

      <button
        className="np-btn np-btn-ghost np-btn-sm"
        style={{ width: "100%", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12.5, padding: "10px 14px", border: "1px solid var(--accent)", color: "var(--accent)" }}
        onClick={handleGeneratePlan}
        disabled={loadingPlan}
      >
        <Sparkles size={15} color="var(--accent)" /> {loadingPlan ? "Crafting your Indian meal plan..." : "✨ Generate AI Indian Meal Plan for Remaining Macros"}
      </button>

      {mealPlan && (
        <div className="np-card" style={{ marginBottom: 14, background: "var(--surface)", border: "1.5px solid var(--accent)", fontSize: 13, lineHeight: 1.55 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--brand)", display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
            <Utensils size={16} /> Personalized Indian Meal Blueprint
          </div>
          <CleanAIMessage text={mealPlan} />
        </div>
      )}

      <div className="np-card" onClick={onOpenChat} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)" }}>
          <Sparkles size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>Ask JazzCoach AI</div>
          <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>"Can I eat this?" or "Suggest a high-protein dinner"</div>
        </div>
        <ChevronRight size={17} color="var(--ink-faint)" />
      </div>

      <div className="np-card">
        <div className="np-card-title">Remaining today</div>
        <div className="np-mini-macros" style={{ marginTop: 0 }}>
          <MiniMacro label="Protein" value={Math.max(0, goals.protein - totals.protein)} goal={goals.protein} color="var(--protein)" />
          <MiniMacro label="Carbs" value={Math.max(0, goals.carbs - totals.carbs)} goal={goals.carbs} color="var(--carbs)" />
          <MiniMacro label="Fat" value={Math.max(0, goals.fat - totals.fat)} goal={goals.fat} color="var(--fat)" />
        </div>
      </div>

      <SmartSwapsSection meals={meals} addMeal={addMeal} remaining={remaining} totals={totals} goals={goals} />
    </>
  );
}

function generateReply(msg, remaining) {
  const m = msg.toLowerCase();
  const picks = pickSuggestionFoods(remaining);
  if (m.includes("can i eat") || m.includes("should i eat") || m.includes("pizza") || m.includes("burger")) {
    if (remaining.calories > 250) {
      return `Yes, absolutely! You have ${remaining.calories} kcal and ${remaining.protein}g protein remaining today. Enjoy it mindfully, but pair it with a lean protein source like ${picks[0] ? picks[0].name.replace(/\s*\(.*\)/, "") : "paneer or roasted chana"} to keep blood sugar stable and muscle protein synthesis elevated.`;
    }
    return `You're within ${remaining.calories} kcal of your daily ceiling. If you eat it now, stick to a controlled half-portion or bank it for tomorrow so you don't overshoot your deficit.`;
  }
  if (m.includes("dinner") || m.includes("lunch")) {
    return `With ${remaining.protein}g protein and ${remaining.calories} kcal open today, here are 3 power combos:
• 150g grilled Paneer Tikka or Tandoori Chicken Tikka with 1 Multigrain Roti and fresh salad (~36g protein, 380 kcal).
• Soya Chunks Curry with 1 bowl Yellow Dal Tadka and cucumber slices (~32g protein, 350 kcal).
• 3-egg Bhurji (2 whole + 2 whites) with 1 whole wheat chapati and chilled Masala Chaas (~28g protein, 290 kcal).`;
  }
  if (m.includes("snack")) {
    return `Top Indian fitness snacks right now:
• 30g Roasted Makhana (Foxnuts) with rock salt: 105 kcal, 3g protein.
• 50g Roasted Chana (Bengal Gram): 185 kcal, 11g protein, 8g fiber!
• 1 scoop Whey Protein in cold water or chilled skim milk: 120 kcal, 24g protein.
• 1 glass chilled Spiced Chaas (buttermilk): 45 kcal, gut-friendly probiotics.`;
  }
  if (m.includes("carb") || m.includes("roti") || m.includes("rice")) {
    return `You have ${remaining.carbs}g carbs left today. Optimize with complex whole grains: oats khichdi, brown basmati, or jowar/bajra rotis. They digest slower, sustain gym endurance, and avoid insulin spikes.`;
  }
  if (m.includes("water") || m.includes("hydrat")) {
    return `Aim for 2.5L to 3.0L daily. Consistent hydration keeps muscles full, supports joint lubrication, and prevents false hunger signals. Keep a bottle at your desk and sip evenly throughout the day.`;
  }
  return buildSuggestionText(remaining) + " Ask me about dinner recipes, high-protein snack ideas, or meal swaps and I'll break down the exact macros!";
}

const CHAT_STORAGE_KEY = "jazz_chat_messages_v1";
const INITIAL_CHAT = [
  { id: 1, from: "ai", text: "Hi! I'm JazzCoach, your personal AI sports dietitian. Ask me things like \"Can I eat this right now?\" or \"Suggest a high-protein Indian dinner with my remaining macros.\"" },
];

function ChatView({ remaining, totals, meals = [], goals = DEFAULT_GOALS, onBack }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_CHAT;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const idRef = useRef(Date.now());
  const prompts = ["Can I eat pizza tonight?", "High-protein Indian dinner?", "What snack should I have?", "Am I drinking enough water?"];

  // Save chat history to localStorage immediately
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {}
  }, [messages]);

  const clearChat = () => {
    setMessages(INITIAL_CHAT);
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(INITIAL_CHAT));
    } catch (e) {}
  };

  async function send(text) {
    const value = (text || input).trim();
    if (!value || loading) return;
    setMessages((m) => [...m, { id: idRef.current++, from: "user", text: value }]);
    setInput("");
    setLoading(true);

    try {
      const reply = await askDietitian(value, remaining, totals, meals, goals);
      setMessages((m) => [...m, { id: idRef.current++, from: "ai", text: reply }]);
    } catch (err) {
      console.error("JazzCoach chat error, using fallback:", err);
      setMessages((m) => [...m, { id: idRef.current++, from: "ai", text: generateReply(value, remaining) }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, flex: 1, background: "var(--surface-2)" }}>
      <div style={{ padding: "16px 18px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: 10, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
          </button>
          <div>
            <div style={{ fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 17, display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={16} color="var(--accent)" /> JazzCoach AI
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>Chat history remembered & synced</div>
          </div>
        </div>
        <button
          onClick={clearChat}
          title="Clear chat history"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 8, padding: "5px 9px", fontSize: 11, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
        >
          <Trash2 size={12} /> Clear
        </button>
      </div>
      <div className="np-chat-scroll">
        {messages.map((m) => (
          <div key={m.id} className={`np-bubble ${m.from === "ai" ? "np-bubble-ai" : "np-bubble-user"}`}>
            {m.from === "ai" ? <CleanAIMessage text={m.text} /> : m.text}
          </div>
        ))}
        {loading && (
          <div className="np-bubble np-bubble-ai" style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-soft)", fontSize: 12.5 }}>
            <Sparkles size={14} color="var(--accent)" /> Consulting JazzCoach...
          </div>
        )}
      </div>
      <div className="np-quick-prompts">
        {prompts.map((p) => <div key={p} className="np-quick-prompt" onClick={() => send(p)}>{p}</div>)}
      </div>
      <div className="np-chat-input-bar">
        <input placeholder="Ask about a meal, snack, or swap…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} disabled={loading} />
        <button className="np-send-btn" onClick={() => send()} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}><Send size={17} /></button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* TRENDS                                                                   */
/* ---------------------------------------------------------------------- */
function aggregateWeekly(history) {
  const weeks = [];
  for (let i = 0; i < history.length; i += 7) {
    const chunk = history.slice(i, i + 7);
    const avg = (k) => Math.round(chunk.reduce((a, d) => a + d[k], 0) / chunk.length);
    weeks.push({ label: `Wk ${Math.floor(i / 7) + 1}`, calories: avg("calories"), burn: avg("burn"), protein: avg("protein"), carbs: avg("carbs"), fat: avg("fat"), water: avg("water") });
  }
  return weeks;
}

function Trends({ history, goals = DEFAULT_GOALS }) {
  const [range, setRange] = useState("week");
  const data = range === "week" ? history.slice(-7) : range === "month" ? history : aggregateWeekly(history);

  const loggedDays = history.filter((d) => d.calories > 0 || d.water > 0 || d.burn > 0);
  const calcBase = loggedDays.length > 0 ? loggedDays : [];
  const avgProtein = calcBase.length > 0 ? Math.round(calcBase.reduce((a, d) => a + d.protein, 0) / calcBase.length) : 0;
  const avgCarbs = calcBase.length > 0 ? Math.round(calcBase.reduce((a, d) => a + d.carbs, 0) / calcBase.length) : 0;
  const avgFat = calcBase.length > 0 ? Math.round(calcBase.reduce((a, d) => a + d.fat, 0) / calcBase.length) : 0;
  const totalMacros = avgProtein + avgCarbs + avgFat;
  const pieData = totalMacros > 0 ? [
    { name: "Protein", value: avgProtein * 4, color: "var(--protein)" },
    { name: "Carbs", value: avgCarbs * 4, color: "var(--carbs)" },
    { name: "Fat", value: avgFat * 9, color: "var(--fat)" },
  ] : [
    { name: "No data", value: 1, color: "#E5E1D3" }
  ];

  const consistency = loggedDays.length > 0 ? Math.round(loggedDays.filter((d) => Math.abs(d.calories - goals.calories) <= goals.calories * 0.12).length / loggedDays.length * 100) : 0;
  const bestProteinDay = loggedDays.length > 0 ? loggedDays.reduce((best, d) => (d.protein > (best?.protein ?? -1) ? d : best), loggedDays[0]) : { protein: 0, label: "None yet" };
  const waterLogged = history.filter((d) => d.water > 0);
  const waterOnTarget = waterLogged.length > 0 ? Math.round(waterLogged.filter((d) => d.water >= goals.water * 0.85).length / waterLogged.length * 100) : 0;
  const avgBurn = loggedDays.length > 0 ? Math.round(loggedDays.reduce((a, d) => a + d.burn, 0) / loggedDays.length) : 0;

  const waterData = data.map((d) => ({ ...d, waterPct: Math.round((d.water / (goals.water || 2500)) * 100) }));

  return (
    <>
      <div className="np-h1" style={{ marginTop: 16 }}>Monthly trends</div>
      <div className="np-sub">Track consistency across the last 30 days</div>

      {loggedDays.length === 0 && (
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px dashed rgba(255,255,255,0.12)",
          borderRadius: 12,
          padding: "12px 14px",
          marginTop: 10,
          marginBottom: 6,
          fontSize: 12,
          color: "var(--ink-soft)",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <span>✨</span>
          <span><strong>Live Data Only:</strong> As you log real meals and activities, your 30-day calorie, macro, and water trends will chart here.</span>
        </div>
      )}

      <div className="np-range-row">
        <button className={`np-range-btn ${range === "week" ? "active" : ""}`} onClick={() => setRange("week")}>7 days</button>
        <button className={`np-range-btn ${range === "month" ? "active" : ""}`} onClick={() => setRange("month")}>30 days</button>
        <button className={`np-range-btn ${range === "weekly" ? "active" : ""}`} onClick={() => setRange("weekly")}>Monthly</button>
      </div>

      <div className="np-card">
        <div className="np-card-title">Calorie intake vs. burn</div>
        <div style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -18, right: 6, top: 6, bottom: 0 }}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1F5D4C" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#1F5D4C" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6E7B73" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#6E7B73" }} axisLine={false} tickLine={false} width={34} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #E5E1D3" }} />
              <ReferenceLine y={goals.calories} stroke="#9CA69E" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="calories" stroke="#1F5D4C" fill="url(#calGrad)" strokeWidth={2} name="Intake" />
              <Area type="monotone" dataKey="burn" stroke="#FF6B47" fill="transparent" strokeWidth={2} name="Burn" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="np-legend-row">
          <div className="np-legend-item"><span className="np-legend-dot" style={{ background: "#1F5D4C" }} /> Intake</div>
          <div className="np-legend-item"><span className="np-legend-dot" style={{ background: "#FF6B47" }} /> Burn</div>
          <div className="np-legend-item"><span className="np-legend-dot" style={{ background: "#9CA69E" }} /> Goal ({goals.calories})</div>
        </div>
      </div>

      <div className="np-card">
        <div className="np-card-title">Average macro distribution</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 130, height: 130, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={3} stroke="none">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color.replace("var(--protein)", "#3E6FE0").replace("var(--carbs)", "#E8A23D").replace("var(--fat)", "#3FA872")} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ flex: 1 }}>
            <MacroPctRow color="var(--protein)" label="Protein" grams={avgProtein} kcal={avgProtein * 4} />
            <MacroPctRow color="var(--carbs)" label="Carbs" grams={avgCarbs} kcal={avgCarbs * 4} />
            <MacroPctRow color="var(--fat)" label="Fat" grams={avgFat} kcal={avgFat * 9} />
          </div>
        </div>
      </div>

      <div className="np-card">
        <div className="np-card-title">Water consistency</div>
        <div style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterData} margin={{ left: -18, right: 6, top: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6E7B73" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#6E7B73" }} axisLine={false} tickLine={false} width={34} unit="%" />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #E5E1D3" }} formatter={(v) => `${v}%`} />
              <ReferenceLine y={100} stroke="#9CA69E" strokeDasharray="4 4" />
              <Bar dataKey="waterPct" fill="#1FB6C9" radius={[5, 5, 0, 0]} name="% of goal" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="np-card-title" style={{ marginTop: 4 }}>This month's highlights</div>
      <div className="np-highlight-grid" style={{ marginBottom: 20 }}>
        <div className="np-highlight">
          <div className="np-highlight-val" style={{ color: "var(--brand)" }}>{consistency}%</div>
          <div className="np-highlight-label">Calorie consistency score</div>
        </div>
        <div className="np-highlight">
          <div className="np-highlight-val" style={{ color: "var(--protein)" }}>{bestProteinDay.protein}g</div>
          <div className="np-highlight-label">Highest protein day ({bestProteinDay.label})</div>
        </div>
        <div className="np-highlight">
          <div className="np-highlight-val" style={{ color: "var(--water)" }}>{waterOnTarget}%</div>
          <div className="np-highlight-label">Days hydration goal met</div>
        </div>
        <div className="np-highlight">
          <div className="np-highlight-val" style={{ color: "var(--fat)" }}>{avgBurn}</div>
          <div className="np-highlight-label">Avg. kcal burned / day</div>
        </div>
      </div>
    </>
  );
}

function MacroPctRow({ color, label, grams, kcal }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{grams}g</span>
      <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{kcal} kcal</span>
    </div>
  );
}
