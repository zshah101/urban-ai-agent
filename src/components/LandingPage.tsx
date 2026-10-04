"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { AnimeNavBar }      from "./ui/anime-navbar";
import { ContainerScroll } from "./ui/container-scroll-animation";
import { BentoItem }        from "./ui/bento-grid";
import { GlowingEffect }    from "./ui/glowing-effect";
import { LocationMap }      from "./ui/expand-map";
import { AlertCard }        from "./ui/alert-card";
import { Dock, DockIcon }   from "./ui/dock";
import { Footer }           from "./ui/footer";
import { GlobalShader }     from "./ui/global-shader";
import { buildMapPopup } from "../lib/map-popup";
import { OwnerAccess } from "./ui/owner-access";
import {
  Home, BarChart3, MapPin, Terminal, Zap, Shield, Database,
  TrendingUp, AlertTriangle, Search, Twitter, Linkedin, Github, Mail, Globe,
  Send, ChevronDown, Monitor, Smartphone, X, ArrowRight,
  FlaskConical, RefreshCw, Flame, MessageSquare, Network, Lock, Cpu, Clock,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────── */
type Phase      = "boot" | "disclaimer" | "exit" | "app";
type AmbientRisk = "neutral" | "critical" | "elevated" | "nominal";
type ToastPhase = "hidden" | "crack" | "open" | "closing";

interface QueryResult {
  store_name?: string | null;
  city?: string;
  zip_code?: string;
  total_crimes?: number;
  population?: number;
  priority_score?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content?: string;
  results?: QueryResult[];
  answer?: string;
  loading?: boolean;
}

/* ────────────────────────────────────────────────────────────
   ZIP COORDINATES — Phoenix Metro Area
──────────────────────────────────────────────────────────── */
const ZIP_COORDS: Record<string, [number, number]> = {
  "85001":[33.4484,-112.0740],"85002":[33.4484,-112.0740],"85003":[33.4484,-112.0740],
  "85004":[33.4500,-112.0660],"85005":[33.4350,-112.1200],"85006":[33.4600,-112.0500],
  "85007":[33.4350,-112.0900],"85008":[33.4600,-112.0100],"85009":[33.4450,-112.1300],
  "85010":[33.4350,-112.0000],"85011":[33.5000,-112.0700],"85012":[33.5100,-112.0700],
  "85013":[33.5200,-112.0800],"85014":[33.5300,-112.0600],"85015":[33.5100,-112.1000],
  "85016":[33.5000,-112.0300],"85017":[33.5000,-112.1200],"85018":[33.4900,-111.9900],
  "85019":[33.5100,-112.1500],"85020":[33.5600,-112.0600],"85021":[33.5500,-112.0900],
  "85022":[33.6000,-112.0400],"85023":[33.6200,-112.1000],"85024":[33.6600,-112.0200],
  "85027":[33.6400,-112.1100],"85028":[33.5600,-111.9900],"85029":[33.5900,-112.1200],
  "85031":[33.4900,-112.1600],"85032":[33.5600,-111.9500],"85033":[33.4900,-112.1900],
  "85034":[33.4200,-112.0300],"85035":[33.4700,-112.1900],"85037":[33.4700,-112.2300],
  "85040":[33.3900,-112.0100],"85041":[33.3700,-112.0700],"85042":[33.3700,-112.0200],
  "85043":[33.3900,-112.1500],"85044":[33.3500,-111.9800],"85048":[33.3100,-111.9800],
  "85050":[33.6300,-111.9700],"85051":[33.5400,-112.1300],"85053":[33.6000,-112.1300],
  "85054":[33.6700,-111.9300],"85083":[33.7200,-112.1000],"85085":[33.7300,-112.0900],
  "85086":[33.7800,-112.1200],"85087":[33.8300,-112.1100],
  "85201":[33.4150,-111.8300],"85202":[33.3900,-111.8500],"85203":[33.4300,-111.8100],
  "85204":[33.4100,-111.7800],"85205":[33.4400,-111.7600],"85206":[33.4100,-111.7500],
  "85207":[33.4400,-111.7200],"85208":[33.4200,-111.7000],"85209":[33.3900,-111.6900],
  "85210":[33.3900,-111.8200],"85212":[33.3700,-111.7000],"85213":[33.4600,-111.7900],
  "85215":[33.4800,-111.7700],"85224":[33.3100,-111.8800],"85225":[33.3200,-111.8300],
  "85226":[33.3400,-111.9500],"85233":[33.3200,-111.8600],"85234":[33.3300,-111.8000],
  "85248":[33.2500,-111.8500],"85249":[33.2600,-111.7700],"85250":[33.5200,-111.9200],
  "85251":[33.4900,-111.9200],"85252":[33.5000,-111.9100],"85253":[33.5300,-111.9000],
  "85254":[33.5900,-111.9500],"85255":[33.6600,-111.8900],"85256":[33.4700,-111.8700],
  "85257":[33.4800,-111.9000],"85258":[33.5500,-111.8800],"85259":[33.5700,-111.8400],
  "85260":[33.6000,-111.8900],"85262":[33.7000,-111.8400],"85266":[33.7100,-111.9100],
  "85268":[33.5900,-111.7900],"85281":[33.4300,-111.9300],"85282":[33.4000,-111.9300],
  "85283":[33.3700,-111.9300],"85284":[33.3400,-111.9300],"85285":[33.3500,-111.9200],
  "85286":[33.3000,-111.9100],"85295":[33.3000,-111.7800],"85296":[33.3200,-111.7500],
  "85297":[33.2800,-111.7600],"85298":[33.2600,-111.8000],"85301":[33.5300,-112.1800],
  "85302":[33.5600,-112.1800],"85303":[33.5100,-112.1700],"85304":[33.5800,-112.1700],
  "85305":[33.5000,-112.2100],"85306":[33.6100,-112.1500],"85307":[33.5200,-112.2500],
  "85308":[33.6300,-112.1500],"85309":[33.4800,-112.2500],"85310":[33.6400,-112.1900],
  "85323":[33.3800,-112.3500],"85326":[33.3500,-112.5000],"85338":[33.3700,-112.4200],
  "85339":[33.2900,-112.3300],"85340":[33.5400,-112.4200],"85351":[33.6200,-112.2700],
  "85353":[33.4400,-112.3700],"85355":[33.5800,-112.4200],"85363":[33.5800,-112.3500],
  "85373":[33.6800,-112.2500],"85374":[33.6300,-112.3300],"85375":[33.6500,-112.3800],
  "85381":[33.5900,-112.2400],"85382":[33.6400,-112.3000],"85383":[33.7000,-112.3300],
  "85388":[33.6200,-112.4100],
};

/* ────────────────────────────────────────────────────────────
   CONSTANTS
──────────────────────────────────────────────────────────── */

const DISCLAIMER_ITEMS = [
  { icon: AlertTriangle, text: "Queries may misfire or return unexpected results"  },
  { icon: Clock,         text: "First query may be slow — cluster spinning up"     },
  { icon: FlaskConical,  text: "Experimental AI — not for policy or law enforcement" },
  { icon: RefreshCw,     text: "Data is indexed, not a live feed"                  },
  { icon: Flame,         text: "Expect bugs. We're fixing them in real time."      },
];

const EXAMPLE_QUERIES = [
  "Which grocery stores are in the most dangerous ZIP codes?",
  "Show the top 5 highest risk locations in Phoenix",
  "Which ZIP codes have the lowest crime per resident?",
  "Find stores with high population but low crime scores",
  "Rank ZIP codes by crime density",
  "Which census tracts have the highest social vulnerability?",
];

const PLACEHOLDER_QUERIES = [
  "Which ZIP codes have the highest crime density?",
  "Show top 5 most dangerous areas in Phoenix...",
  "Which grocery stores are in safe zones?",
  "Rank ZIP codes by urban risk...",
];

const FAQ_ITEMS = [
  {
    q: "How does AURA generate answers from plain English?",
    a: "After unlocking Owner access, GPT-4o-mini proposes a structured query plan. AURA validates the dataset and filters, builds a fixed SELECT template with bound parameters, and retrieves up to 20 rows from Databricks. The model then explains those results in plain English.",
  },
  {
    q: "What data sources does AURA use?",
    a: "AURA indexes crime incident data, population statistics, grocery store locations, SNAP availability, Social Vulnerability Index (SVI), and US Census data — all for the Phoenix metro area.",
  },
  {
    q: "Is my query data stored or shared?",
    a: "AURA does not save query history or log questions and answers. Questions and a limited result preview are sent to OpenAI; SQL and bound filters are sent to Databricks. Provider and hosting retention depends on your account settings. AI execution is private through Owner access.",
  },
  {
    q: "Can I trust the risk scores for real decisions?",
    a: "AURA is experimental research software. Risk scores are statistical approximations and must NOT be used for law enforcement, policy decisions, operational planning, or public safety determinations.",
  },
];


/* ─── Feature Cards ─────────────────────────────────────── */
const featureItems: BentoItem[] = [
  {
    title: "AI Risk Scoring Engine",
    meta: "GPT-4o-mini",
    description:
      "GPT-4o-mini plans rankings across six urban datasets. The server validates each plan and builds bounded queries; private Owner access unlocks execution.",
    icon: <TrendingUp className="w-4 h-4 text-amber-400" />,
    status: "Live",
    tags: ["AI", "GPT-4o-mini", "NLP"],
    colSpan: 2,
    hasPersistentHover: true,
    cta: "Try it →",
  },
  {
    title: "ZIP Code Intelligence",
    meta: "320+ zones",
    description:
      "Granular risk scores for every Phoenix metro ZIP code. Population-weighted crime density and priority ranking.",
    icon: <MapPin className="w-4 h-4 text-blue-400" />,
    status: "Active",
    tags: ["GeoData", "Phoenix"],
    cta: "Explore →",
  },
  {
    title: "Validated SELECT Templates",
    meta: "6 datasets",
    description:
      "Fixed table and column allowlists, named parameters, and a 20-row cap keep model-generated SQL out of execution. Paid queries require Owner access.",
    icon: <Shield className="w-4 h-4 text-purple-400" />,
    status: "Protected",
    tags: ["Security", "SQL"],
    cta: "Learn more →",
  },
  {
    title: "Databricks Cluster",
    meta: "Sub-second",
    description:
      "High-performance Databricks SQL cluster delivers results in under 2 seconds. Auto-spins up on first query.",
    icon: <Database className="w-4 h-4 text-amber-400" />,
    status: "Online",
    tags: ["Infrastructure", "Databricks"],
    colSpan: 2,
    cta: "View docs →",
  },
];

/* ─── Footer Data ───────────────────────────────────────── */
const socialLinks = [
  { icon: <Twitter  className="w-5 h-5" />, href: "#",                                          label: "Twitter"  },
  { icon: <Linkedin className="w-5 h-5" />, href: "https://linkedin.com/in/zain-sahir-s-4b1a9a227", label: "LinkedIn" },
  { icon: <Github   className="w-5 h-5" />, href: "https://github.com/SikeTheMike",               label: "GitHub"   },
  { icon: <Mail     className="w-5 h-5" />, href: "mailto:shahzain.zeza@gmail.com",               label: "Email"    },
];

const footerNavLinks = [
  { label: "Features", href: "#features" },
  { label: "Coverage", href: "#coverage" },
  { label: "Query",    href: "#query"    },
  { label: "About",    href: "#about"    },
  { label: "System",   href: "#system"   },
  { label: "Beta",     href: "#beta"     },
];

/* ════════════════════════════════════════════════════════════
   LIGHTNING — WebGL1 shader canvas (from hero-odyssey.tsx)
════════════════════════════════════════════════════════════ */
interface LightningProps {
  hue?: number;
  xOffset?: number;
  speed?: number;
  intensity?: number;
  size?: number;
}

function Lightning({ hue = 230, xOffset = 0, speed = 1, intensity = 1, size = 1 }: LightningProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      canvas.width  = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vertSrc = `
      attribute vec2 aPosition;
      void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
    `;
    const fragSrc = `
      precision mediump float;
      uniform vec2  iResolution;
      uniform float iTime;
      uniform float uHue;
      uniform float uXOffset;
      uniform float uSpeed;
      uniform float uIntensity;
      uniform float uSize;
      #define OCTAVE_COUNT 10
      vec3 hsv2rgb(vec3 c){
        vec3 rgb=clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);
        return c.z*mix(vec3(1.0),rgb,c.y);
      }
      float hash11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
      float hash12(vec2 p){
        vec3 p3=fract(vec3(p.xyx)*.1031);
        p3+=dot(p3,p3.yzx+33.33);
        return fract((p3.x+p3.y)*p3.z);
      }
      mat2 rotate2d(float t){float c=cos(t),s=sin(t);return mat2(c,-s,s,c);}
      float noise(vec2 p){
        vec2 ip=floor(p),fp=fract(p);
        float a=hash12(ip),b=hash12(ip+vec2(1,0)),c=hash12(ip+vec2(0,1)),d=hash12(ip+vec2(1,1));
        vec2 t=smoothstep(0.0,1.0,fp);
        return mix(mix(a,b,t.x),mix(c,d,t.x),t.y);
      }
      float fbm(vec2 p){
        float v=0.0,a=0.5;
        for(int i=0;i<OCTAVE_COUNT;i++){v+=a*noise(p);p*=rotate2d(0.45)*2.0;a*=0.5;}
        return v;
      }
      void mainImage(out vec4 fc,in vec2 coord){
        vec2 uv=coord/iResolution.xy;
        uv=2.0*uv-1.0;
        uv.x*=iResolution.x/iResolution.y;
        uv.x+=uXOffset;
        uv+=2.0*fbm(uv*uSize+0.8*iTime*uSpeed)-1.0;
        float dist=abs(uv.x);
        vec3 base=hsv2rgb(vec3(uHue/360.0,0.7,0.8));
        vec3 col=base*pow(mix(0.0,0.07,hash11(iTime*uSpeed))/dist,1.0)*uIntensity;
        fc=vec4(col,1.0);
      }
      void main(){mainImage(gl_FragColor,gl_FragCoord.xy);}
    `;

    const mkShader = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const vs   = mkShader(gl.VERTEX_SHADER,   vertSrc);
    const fs   = mkShader(gl.FRAGMENT_SHADER, fragSrc);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const verts = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
    const buf   = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(prog, "aPosition");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes  = gl.getUniformLocation(prog, "iResolution");
    const uTime = gl.getUniformLocation(prog, "iTime");
    const uH    = gl.getUniformLocation(prog, "uHue");
    const uX    = gl.getUniformLocation(prog, "uXOffset");
    const uSp   = gl.getUniformLocation(prog, "uSpeed");
    const uIn   = gl.getUniformLocation(prog, "uIntensity");
    const uSz   = gl.getUniformLocation(prog, "uSize");

    const start = performance.now();
    let raf: number;
    const render = () => {
      resizeCanvas();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes,  canvas.width, canvas.height);
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.uniform1f(uH,  hue);
      gl.uniform1f(uX,  xOffset);
      gl.uniform1f(uSp, speed);
      gl.uniform1f(uIn, intensity);
      gl.uniform1f(uSz, size);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(raf);
    };
  }, [hue, xOffset, speed, intensity, size]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

/* ════════════════════════════════════════════════════════════
   FEATURE ITEM — floating label for hero
════════════════════════════════════════════════════════════ */
function FeatureItem({ name, value, position }: { name: string; value: string; position: string }) {
  return (
    <div className={`absolute ${position} z-10 group transition-all duration-300 hover:scale-110`}>
      <div className="flex items-center gap-2 relative">
        <div className="relative">
          <div className="w-2 h-2 bg-amber-400 rounded-full group-hover:animate-pulse" />
          <div className="absolute -inset-1 bg-amber-400/20 rounded-full blur-sm opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        <div className="text-white relative">
          <div className="font-medium text-sm group-hover:text-white transition-colors duration-300">{name}</div>
          <div className="text-white/60 text-xs group-hover:text-white/70 transition-colors duration-300">{value}</div>
          <div className="absolute -inset-2 bg-amber-400/10 rounded-lg blur-md opacity-70 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   LIGHTNING HERO — replaces HeroGeometric
════════════════════════════════════════════════════════════ */
function LightningHero() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-transparent">
      {/* Lightning canvas — higher intensity so it reads through the overlay */}
      <div className="absolute inset-0 z-0">
        <Lightning hue={32} xOffset={0} speed={2.0} intensity={1.1} size={1.8} />
      </div>

      {/* Overlay — lighter so lightning punches through */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-transparent z-[1]" />

      {/* Warm amber bloom at base — bridges lightning into global shader */}
      <div className="absolute bottom-0 left-0 right-0 h-[65%] bg-gradient-to-t from-amber-950/40 via-orange-950/15 to-transparent z-[2] pointer-events-none" />

      {/* Bottom edge dissolve */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#02040A] to-transparent z-[5] pointer-events-none" />

      {/* Glowing sphere — warmer tint */}
      <div
        className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[550px] sm:h-[550px] rounded-full backdrop-blur-3xl z-[3]"
        style={{ background: "radial-gradient(circle at 25% 90%, #92400e 18%, #1a0800cc 65%, #000000ed 100%)" }}
      />

      {/* Floating feature items — hidden on mobile to avoid overlap */}
      <div className="absolute inset-0 z-[6] hidden sm:block">
        <FeatureItem name="847K+ Records" value="Phoenix Metro"  position="left-4 sm:left-12 top-[44%]" />
        <FeatureItem name="GPT-4o"        value="AI Engine"      position="left-[22%] top-[33%]"         />
        <FeatureItem name="Validated SQL" value="SELECT Templates" position="right-[22%] top-[33%]"      />
        <FeatureItem name="Databricks"    value="Sub-second"     position="right-4 sm:right-12 top-[44%]" />
      </div>

      {/* Hero content */}
      <div className="absolute inset-0 z-[7] flex flex-col items-center justify-center text-center px-6">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 backdrop-blur-md border border-amber-400/20 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-100/80 font-mono text-[11px] tracking-[0.25em] uppercase">
              Phoenix Metro Analytics
            </span>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.35 }}
          className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight mb-2"
        >
          <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-amber-300 bg-clip-text text-transparent">
            Urban Risk
          </span>
        </motion.h1>
        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.5 }}
          className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight mb-6 md:mb-9"
        >
          <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 bg-clip-text text-transparent">
            Intelligence
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65 }}
          className="text-white/45 text-base md:text-lg max-w-xl mx-auto mb-10 font-mono leading-relaxed"
        >
          AI-powered analytics over 847K+ Phoenix crime records.
          <br className="hidden sm:block" />
          Ask anything in plain English.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <motion.button
            onClick={() => document.getElementById("query")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black rounded-full font-bold text-sm transition-all duration-300 shadow-lg shadow-amber-900/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            Query the City
          </motion.button>
          <motion.button
            onClick={() => document.getElementById("coverage")?.scrollIntoView({ behavior: "smooth" })}
            className="px-8 py-3.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/25 hover:border-amber-400/40 text-amber-100/80 rounded-full font-semibold text-sm transition-all duration-300 backdrop-blur-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            View Coverage
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PRE-ENTRY FLOW COMPONENTS
════════════════════════════════════════════════════════════ */


function DisclaimerScreen({ onAccept, isExiting }: { onAccept: () => void; isExiting: boolean }) {
  const [pulse, setPulse] = useState(false);
  const [cardTransform, setCardTransform] = useState("translate(-50%,-50%) rotateX(40deg) scale(0.8)");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setPulse(true), 2100);
    return () => clearTimeout(t);
  }, []);

  /* ── shared card body ─────────────────────────────────── */
  const cardBody = (
    <>
      <div className="flex items-center gap-1.5 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
        <span className="ml-2 text-white/20 text-[10px] font-mono">aura — access gate</span>
        <span className="ml-auto px-1.5 py-0.5 rounded-full border border-amber-500/20 text-amber-400/40 text-[9px] font-mono tracking-wider">Beta</span>
      </div>
      <motion.h2 className="text-lg font-bold text-white mb-1"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        Before You Enter AURA
      </motion.h2>
      <motion.p className="text-white/30 text-[11px] mb-4 font-mono leading-relaxed"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
        Experimental AI urban risk platform. Read before proceeding.
      </motion.p>
      <div className="space-y-1.5 mb-4">
        {DISCLAIMER_ITEMS.map(({ icon: Icon, text }, i) => (
          <motion.div key={i}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.025] border border-amber-900/15"
            initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.24 + i * 0.08 }}>
            <Icon className="w-3 h-3 text-amber-400/65 flex-shrink-0" />
            <span className="text-white/45 text-[11px] font-mono">{text}</span>
          </motion.div>
        ))}
      </div>
      <motion.p className="text-white/18 text-[10px] font-mono mb-4 px-2.5 py-2 rounded-lg bg-red-500/[0.04] border border-red-500/[0.07] leading-relaxed"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.72 }}>
        NOT FOR: law enforcement · policy decisions · public safety determinations.
      </motion.p>
      <motion.button
        onClick={onAccept}
        className={`w-full py-3 rounded-xl font-semibold text-xs transition-all duration-500 font-mono cursor-pointer ${
          pulse
            ? "bg-amber-500 text-black shadow-[0_0_28px_rgba(245,158,11,0.25)]"
            : "bg-white/[0.06] text-white/40 border border-white/[0.08]"
        }`}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.88 }}
        whileTap={{ scale: 0.97 }}>
        I understand — enter AURA Beta
      </motion.button>
    </>
  );

  return (
    <motion.div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden"
      style={{ background: "#02040A" }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.48 }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[min(700px,_100vw)] h-[300px] md:h-[500px] rounded-full bg-amber-500/[0.04] blur-[100px]" />
      </div>

      {isMobile ? (
        /* ── MOBILE: plain flat card, no 3D ── */
        <div className="relative z-50 w-[min(340px,_92vw)] rounded-2xl shadow-[0_8px_16px_rgb(0_0_0/0.4)] bg-[#02040A] border border-amber-900/20 p-4 overflow-hidden">
          {cardBody}
        </div>
      ) : (
        /* ── DESKTOP: 3D tilt PinContainer ── */
        <div
          className="relative group/pin z-50 cursor-default"
          onMouseEnter={() => setCardTransform("translate(-50%,-50%) rotateX(0deg) scale(1)")}
          onMouseLeave={() => setCardTransform("translate(-50%,-50%) rotateX(40deg) scale(0.8)")}
        >
          <div
            style={{ perspective: "1000px", transform: "rotateX(70deg) translateZ(0deg)" }}
            className="absolute left-1/2 top-1/2 ml-[0.09375rem] mt-4 -translate-x-1/2 -translate-y-1/2"
          >
            <div
              style={{ transform: cardTransform }}
              className="absolute left-1/2 p-4 top-1/2 flex justify-start items-start rounded-2xl shadow-[0_8px_16px_rgb(0_0_0/0.4)] bg-[#02040A] border border-amber-900/20 group-hover/pin:border-amber-500/20 transition duration-700 overflow-hidden"
            >
              <div className="relative z-50 w-[320px]">
                {cardBody}
              </div>
            </div>
          </div>

          {/* PinPerspective — fades in on hover */}
          <div className="pointer-events-none w-96 h-80 flex items-center justify-center opacity-0 group-hover/pin:opacity-100 z-[60] transition duration-500">
            <div className="w-full h-full -mt-7 flex-none inset-0">
              <div className="absolute top-0 inset-x-0 flex justify-center">
                <div className="relative flex items-center gap-1.5 z-10 rounded-full bg-[#02040A] py-0.5 px-4 ring-1 ring-amber-900/25">
                  <Zap size={10} className="text-amber-400" />
                  <span className="relative z-20 text-amber-400/80 text-xs font-bold font-mono inline-block py-0.5">AURA — Beta Gate</span>
                  <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-amber-400/0 via-amber-400/90 to-amber-400/0 transition-opacity duration-500 group-hover/pin:opacity-40" />
                </div>
              </div>
              <div
                style={{ perspective: "1000px", transform: "rotateX(70deg) translateZ(0)" }}
                className="absolute left-1/2 top-1/2 ml-[0.09375rem] mt-4 -translate-x-1/2 -translate-y-1/2"
              >
                {[0, 2, 4].map((delay) => (
                  <motion.div key={delay}
                    initial={{ opacity: 0, scale: 0, x: "-50%", y: "-50%" }}
                    animate={{ opacity: [0, 1, 0.5, 0], scale: 1, z: 0 }}
                    transition={{ duration: 6, repeat: Infinity, delay }}
                    className="absolute left-1/2 top-1/2 h-[11.25rem] w-[11.25rem] rounded-[50%] bg-amber-500/[0.07] shadow-[0_8px_16px_rgb(0_0_0/0.4)]"
                  />
                ))}
              </div>
              <motion.div className="absolute right-1/2 bottom-1/2 bg-gradient-to-b from-transparent to-amber-500 translate-y-[14px] w-px h-20 group-hover/pin:h-40 blur-[2px]" />
              <motion.div className="absolute right-1/2 bottom-1/2 bg-gradient-to-b from-transparent to-amber-500 translate-y-[14px] w-px h-20 group-hover/pin:h-40" />
              <motion.div className="absolute right-1/2 translate-x-[1.5px] bottom-1/2 bg-amber-500 translate-y-[14px] w-[4px] h-[4px] rounded-full z-40 blur-[3px]" />
              <motion.div className="absolute right-1/2 translate-x-[0.5px] bottom-1/2 bg-amber-300 translate-y-[14px] w-[2px] h-[2px] rounded-full z-40" />
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function LoadingScreen() {
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: "#02040A" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9 }}
    >
      <p className="text-white/60 font-mono text-xl tracking-widest">
        Loading AURA
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.7, repeat: Infinity }}
        >
          █
        </motion.span>
      </p>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   SCROLL REVEAL
════════════════════════════════════════════════════════════ */
function ScrollReveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref     = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
      transition={{ duration: 0.75, delay, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   GLOW CARD
════════════════════════════════════════════════════════════ */
function GlowCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--gx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--gy", `${e.clientY - rect.top}px`);
    el.style.setProperty("--go", "1");
  }, []);

  const handleMouseLeave = useCallback(() => {
    ref.current?.style.setProperty("--go", "0");
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative ${className}`}
      style={{ "--gx": "50%", "--gy": "50%", "--go": "0" } as React.CSSProperties}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] z-10 transition-opacity duration-300"
        style={{
          opacity:    "var(--go)",
          background: "radial-gradient(350px circle at var(--gx) var(--gy), rgba(245,158,11,0.07), transparent 60%)",
        }}
      />
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   RISK CARD — result display
════════════════════════════════════════════════════════════ */
function RiskCard({ result, index }: { result: QueryResult; index: number }) {
  const score    = result.priority_score ?? 0;
  const isCrit   = score >= 50;
  const isElev   = score >= 20 && score < 50;
  const level    = isCrit ? "CRITICAL" : isElev ? "ELEVATED" : "NOMINAL";
  const badgeCls = isCrit
    ? "text-red-400 border-red-500/25 bg-red-500/[0.09]"
    : isElev
    ? "text-amber-400 border-amber-500/25 bg-amber-500/[0.09]"
    : "text-green-400 border-green-500/25 bg-green-500/[0.09]";
  const barColor   = isCrit ? "#f87171" : isElev ? "#fbbf24" : "#34d399";
  const scoreColor = isCrit ? "text-red-400" : isElev ? "text-amber-400" : "text-green-400";

  return (
    <motion.div
      className="flex-shrink-0 w-44 sm:w-52 bg-[#070d08] border border-amber-900/20 rounded-2xl p-3 sm:p-4 hover:border-amber-800/30 transition-colors"
      initial={{ opacity: 0, scale: 0.82, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 280, damping: 22 }}
    >
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold mb-3 ${badgeCls}`}>
        <div className="w-1.5 h-1.5 rounded-full bg-current" />
        {level}
      </div>
      <p className="text-white/85 font-semibold text-sm mb-0.5 truncate font-mono">
        {result.store_name || `ZIP ${result.zip_code}`}
      </p>
      <p className="text-white/30 text-xs mb-3 font-mono">
        {[result.city, result.zip_code].filter(Boolean).join(" · ")}
      </p>
      <div className="space-y-1.5 mb-3 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-white/30">Crimes</span>
          <span className="text-red-400">{result.total_crimes?.toLocaleString() ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/30">Population</span>
          <span className="text-white/50">{result.population?.toLocaleString() ?? "—"}</span>
        </div>
      </div>
      <div className="flex justify-between text-xs font-mono mb-1.5">
        <span className="text-white/30">Risk Score</span>
        <span className={`font-bold ${scoreColor}`}>{score}/100</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ delay: 0.2 + index * 0.05, duration: 0.65, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   QUERY TERMINAL — connects to /api/query
════════════════════════════════════════════════════════════ */
function QueryTerminal({
  messages, loading, question, setQuestion, onSubmit, feedRef, typedPlaceholder,
}: {
  messages: ChatMessage[];
  loading: boolean;
  question: string;
  setQuestion: (v: string) => void;
  onSubmit: () => void;
  feedRef: React.RefObject<HTMLDivElement>;
  typedPlaceholder: string;
}) {
  return (
    <div className="w-full max-w-3xl mx-auto px-3 md:px-6">
      <GlowCard className="rounded-2xl">
        <div className="bg-[#070d08]/90 border border-amber-900/20 rounded-2xl overflow-hidden backdrop-blur-xl">

          {/* Terminal header */}
          <div className="relative flex items-center gap-2 px-5 py-3.5 border-b border-amber-900/20 overflow-hidden">
            <AnimatePresence>
              {loading && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ x: "-110%" }}
                  animate={{ x: "110%" }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                  style={{ background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.04), transparent)" }}
                />
              )}
            </AnimatePresence>

            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
            </div>
            <span className="ml-2 text-white/25 text-xs font-mono">aura — risk_query</span>

            <div className="ml-auto flex items-center gap-2">
              {loading ? (
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 h-1 rounded-full bg-amber-400/50"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 0.88, delay: i * 0.18, repeat: Infinity }}
                    />
                  ))}
                  <span className="text-white/25 text-xs font-mono ml-1">Processing</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-amber-400/50 text-xs font-mono">Ready</span>
                </div>
              )}
            </div>
          </div>

          {/* Message feed */}
          <div
            ref={feedRef}
            className="h-[40vh] md:h-[50vh] overflow-y-auto p-3 md:p-5 space-y-4 md:space-y-5"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(245,158,11,0.1) transparent" }}
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-950/30 border border-amber-900/20 flex items-center justify-center mb-4">
                  <Terminal className="w-6 h-6 text-amber-400/30" />
                </div>
                <p className="text-white/20 text-sm font-mono">Type a query or click an example above</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[78%]">
                        <p className="text-white/25 text-[10px] font-mono mb-1.5 text-right tracking-widest">QUERY</p>
                        <div className="bg-amber-950/20 border border-amber-900/20 rounded-2xl rounded-tr-md px-4 py-3">
                          <p className="text-white/80 text-sm leading-relaxed font-mono">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  ) : msg.loading ? (
                    <div className="flex items-center gap-2.5 pl-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-amber-400/30"
                          animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.72, delay: i * 0.14, repeat: Infinity }}
                        />
                      ))}
                      <span className="text-white/20 text-xs font-mono">Querying Databricks cluster</span>
                    </div>
                  ) : (
                    <div className="max-w-[94%] space-y-4">
                      {msg.answer && (
                        <div className="border border-amber-900/20 rounded-2xl p-4 bg-amber-950/10">
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span className="text-amber-400/50 text-[10px] font-mono uppercase tracking-widest">AURA Analysis</span>
                          </div>
                          <p className="text-white/60 text-sm leading-relaxed font-mono">{msg.answer}</p>
                        </div>
                      )}
                      {msg.results && msg.results.length > 0 && (
                        <div
                          className="overflow-x-auto pb-2"
                          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(245,158,11,0.1) transparent" }}
                        >
                          <div className="flex gap-3 w-max">
                            {msg.results.map((r, i) => (
                              <RiskCard key={i} result={r} index={i} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input bar */}
          <div className="p-3 border-t border-amber-900/20">
            <div className="flex gap-3 items-center bg-white/[0.02] border border-amber-900/20 rounded-xl px-4 py-3 backdrop-blur-sm transition-all focus-within:border-amber-800/30">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading && question.trim()) onSubmit();
                }}
                placeholder={typedPlaceholder ? `${typedPlaceholder}█` : "Ask about urban risk in Phoenix..."}
                disabled={loading}
                className="flex-1 bg-transparent text-white/85 text-sm placeholder:text-white/15 focus:outline-none disabled:cursor-not-allowed font-mono"
              />
              <motion.button
                onClick={onSubmit}
                disabled={loading || !question.trim()}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all font-mono ${
                  question.trim() && !loading
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-900/30 hover:bg-amber-400"
                    : "bg-white/[0.04] text-white/20 cursor-not-allowed"
                }`}
                whileHover={question.trim() && !loading ? { scale: 1.02 } : {}}
                whileTap={question.trim() && !loading ? { scale: 0.97 } : {}}
              >
                {loading ? (
                  <span className="tracking-widest text-amber-400/40">···</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Execute</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </GlowCard>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   RISK MAP — conditional, bundled Leaflet
════════════════════════════════════════════════════════════ */
function RiskMapSection({ mapResults }: { mapResults: QueryResult[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    if (!mapResults.length) return;

    let canceled = false;
    const init = (L: typeof import("leaflet")) => {
      if (canceled || !mapContainerRef.current) return;
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }

      if (!document.getElementById("aura-map-styles")) {
        const s = document.createElement("style");
        s.id = "aura-map-styles";
        s.textContent = `
          @keyframes aura-pulse{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.7);opacity:0}}
          .aura-ring{animation:aura-pulse 2s ease-in-out infinite}
          .leaflet-popup-content-wrapper{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important}
          .leaflet-popup-tip-container{display:none!important}
          .leaflet-popup-content{margin:0!important}
          .leaflet-container{background:#02040A!important}
        `;
        document.head.appendChild(s);
      }

      const map = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 18 }).addTo(map);

      const bounds: [number, number][] = [];
      mapResults.forEach((r) => {
        const coords = r.zip_code ? ZIP_COORDS[r.zip_code] : undefined;
        if (!coords) return;
        const score = r.priority_score ?? 0;
        const color = score >= 50 ? "#f87171" : score >= 20 ? "#fbbf24" : "#34d399";

        const icon = L.divIcon({
          className: "",
          html: `<div style="position:relative;width:20px;height:20px;transform:translate(-50%,-50%)">
            <div class="aura-ring" style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${color};opacity:.5"></div>
            <div style="position:absolute;inset:0;border-radius:50%;background:${color};box-shadow:0 0 10px ${color}88"></div>
          </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });

        L.marker(coords, { icon }).addTo(map).bindPopup(buildMapPopup(r), { className: "" });
        bounds.push(coords);
      });

      if (bounds.length) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      leafletRef.current = map;
    };

    void import("leaflet").then(init).catch(() => undefined);

    return () => {
      canceled = true;
      if (leafletRef.current) { leafletRef.current.remove(); leafletRef.current = null; }
    };
  }, [mapResults]);

  const crit = mapResults.filter((r) => (r.priority_score ?? 0) >= 50).length;
  const elev = mapResults.filter((r) => (r.priority_score ?? 0) >= 20 && (r.priority_score ?? 0) < 50).length;
  const nom  = mapResults.filter((r) => (r.priority_score ?? 0) < 20).length;

  return (
    <motion.section
      id="aura-map"
      className="px-6 pb-16"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
    >
      <div className="max-w-6xl mx-auto">
        <GlowCard className="rounded-2xl">
          <div className="bg-[#070d08] border border-amber-900/20 rounded-2xl overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 justify-between px-5 py-4 border-b border-amber-900/20">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400/60" />
                <span className="text-white/60 font-mono text-sm">Risk Map</span>
                <span className="text-white/20 text-xs font-mono">· {mapResults.length} locations</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                {[
                  { color: "bg-red-400",   label: "Critical", count: crit },
                  { color: "bg-amber-400", label: "Elevated", count: elev },
                  { color: "bg-green-400", label: "Nominal",  count: nom  },
                ].map(({ color, label, count }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-white/30">{label} ({count})</span>
                  </div>
                ))}
              </div>
            </div>
            <div ref={mapContainerRef} className="h-[300px] md:h-[420px] w-full" style={{ background: "#02040A" }} />
          </div>
        </GlowCard>
      </div>
    </motion.section>
  );
}

/* ════════════════════════════════════════════════════════════
   TOAST NOTIFICATION — first query only
════════════════════════════════════════════════════════════ */
function Toast({ phase, onDismiss }: { phase: ToastPhase; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {(phase === "crack" || phase === "open") && (
        <motion.div
          className="fixed bottom-4 left-3 right-3 md:left-auto md:right-6 md:bottom-6 z-[60] md:max-w-[320px]"
          initial={{ opacity: 0, y: 48, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-[#070d08] border border-amber-900/20 rounded-2xl p-5 shadow-2xl shadow-black/65">
            <div className="flex items-start gap-3">
              <motion.div
                animate={
                  phase === "crack"
                    ? { rotate: [-6, 6, -4, 4, 0], scale: [1, 1.12, 1] }
                    : { scale: [1, 1.06, 1] }
                }
                transition={
                  phase === "crack"
                    ? { duration: 0.44 }
                    : { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }
                className="w-10 h-10 rounded-xl bg-amber-500/[0.09] border border-amber-500/14 flex items-center justify-center flex-shrink-0"
              >
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </motion.div>
              <div className="flex-1">
                <motion.h4
                  className="text-white font-semibold text-sm mb-1 font-mono"
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Heads Up
                </motion.h4>
                <motion.p
                  className="text-white/40 text-xs leading-relaxed font-mono"
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 }}
                >
                  First couple of queries might be slow — AURA is spinning up its cluster.
                </motion.p>
              </div>
              <button
                onClick={onDismiss}
                className="text-white/20 hover:text-white/50 transition-colors mt-0.5"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════════════════════════
   VIEW TOGGLE — fixed bottom-left
════════════════════════════════════════════════════════════ */
function ViewToggle({ forceDesktop, setForceDesktop }: { forceDesktop: boolean; setForceDesktop: (v: boolean) => void }) {
  return (
    <motion.button
      className="hidden md:flex fixed bottom-6 left-6 z-[60] w-12 h-12 rounded-full bg-[#070d08] border border-amber-900/20 backdrop-blur-xl items-center justify-center hover:border-amber-800/30 transition-all"
      whileHover={{ scale: 1.14 }}
      whileTap={{ scale: 0.9 }}
      onClick={() => setForceDesktop(!forceDesktop)}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 }}
      title={forceDesktop ? "Switch to mobile view" : "Switch to desktop view"}
    >
      {forceDesktop ? (
        <Smartphone className="w-5 h-5 text-white/40" />
      ) : (
        <Monitor className="w-5 h-5 text-white/40" />
      )}
    </motion.button>
  );
}

/* ════════════════════════════════════════════════════════════
   SECTION PRIMITIVES
════════════════════════════════════════════════════════════ */
function Section({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`py-14 px-4 md:py-28 md:px-6 ${className}`}>
      <div className="max-w-6xl mx-auto w-full">{children}</div>
    </section>
  );
}

function SectionLabel({ tag, title, subtitle }: { tag: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-8 md:mb-16">
      <span className="text-xs font-mono tracking-[0.3em] uppercase text-amber-400/60">
        {tag}
      </span>
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-3 text-white tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-white/40 font-mono mt-3 md:mt-4 max-w-xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   AURA DASHBOARD PREVIEW
════════════════════════════════════════════════════════════ */
function AuraDashboardPreview() {
  const rows = [
    { zip: "85034", city: "Phoenix",    crimes: 1847, score: 94, trend: "+3%" },
    { zip: "85008", city: "Phoenix",    crimes: 1621, score: 87, trend: "+1%" },
    { zip: "85040", city: "Phoenix",    crimes: 1204, score: 74, trend: "-2%" },
    { zip: "85281", city: "Tempe",      crimes: 983,  score: 61, trend: "+5%" },
    { zip: "85201", city: "Mesa",       crimes: 742,  score: 48, trend: "-1%" },
    { zip: "85251", city: "Scottsdale", crimes: 391,  score: 27, trend: "-4%" },
  ];

  const riskColor = (score: number) =>
    score > 80 ? "#ef4444" : score > 60 ? "#f59e0b" : "#10b981";

  return (
    <div className="h-full w-full bg-[#02040A] p-5 font-mono text-xs overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-amber-900/20">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-amber-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <span className="text-amber-400/40 ml-2 tracking-[0.2em] text-[10px] uppercase">
          AURA — Urban Risk Analytics v0.1-beta
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400/40 text-[10px] tracking-widest">LIVE</span>
        </div>
      </div>

      <div className="mb-5 p-3 bg-amber-950/20 rounded-lg border border-amber-900/20">
        <span className="text-amber-400/50">› </span>
        <span className="text-white/60">
          Show me the top 6 highest risk ZIP codes in Phoenix metro area ranked by priority score
        </span>
        <span className="inline-block w-2 h-4 bg-amber-400/60 ml-1 animate-pulse align-middle" />
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-5 gap-2 text-[10px] text-white/25 uppercase tracking-[0.2em] mb-2 px-2">
          {["ZIP", "City", "Crimes", "Score", "Trend"].map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
        <div className="space-y-1">
          {rows.map((row, i) => (
            <div
              key={row.zip}
              className="grid grid-cols-5 gap-2 px-2 py-2 rounded-lg text-[11px]"
              style={{
                background: i === 0 ? "rgba(239,68,68,0.07)" : i === 1 ? "rgba(245,158,11,0.05)" : "rgba(255,255,255,0.02)",
                borderLeft: `2px solid ${riskColor(row.score)}40`,
              }}
            >
              <span className="text-amber-400 font-bold">{row.zip}</span>
              <span className="text-white/60">{row.city}</span>
              <span className="text-white/60">{row.crimes.toLocaleString()}</span>
              <span className="font-bold" style={{ color: riskColor(row.score) }}>{row.score}</span>
              <span className={row.trend.startsWith("+") ? "text-red-400" : "text-green-400"}>{row.trend}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-amber-900/20 flex items-center justify-between text-[10px] text-white/25">
        <span>847,214 records indexed · Databricks SQL</span>
        <span className="text-amber-400/40">Query time: 0.34s</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ORBITAL FEATURES
════════════════════════════════════════════════════════════ */
function AuraFeaturesGrid({ items }: { items: BentoItem[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoRotate) return;
    const timer = setInterval(() => {
      setRotationAngle(prev => (prev + 0.22) % 360);
    }, 50);
    return () => clearInterval(timer);
  }, [autoRotate]);

  const getPosition = (index: number) => {
    const baseAngle = (index / items.length) * 360;
    const angle = (baseAngle + rotationAngle) % 360;
    const radius = 188;
    const rad = (angle * Math.PI) / 180;
    const x = radius * Math.cos(rad);
    const y = radius * Math.sin(rad);
    const zIdx = Math.round(100 + 50 * Math.cos(rad));
    const opacity = Math.max(0.72, Math.min(1, 0.72 + 0.28 * ((1 + Math.sin(rad)) / 2)));
    return { x, y, zIdx, opacity, angle };
  };

  const handleNode = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (expandedId === id) { setExpandedId(null); setAutoRotate(true); }
    else { setExpandedId(id); setAutoRotate(false); }
  };

  const statusColor = (s: string) => {
    if (s === "Live" || s === "Online") return "bg-amber-950/60 text-amber-400/80 border-amber-900/30";
    if (s === "Protected") return "bg-purple-950/40 text-purple-400/70 border-purple-900/20";
    return "bg-blue-950/40 text-blue-400/70 border-blue-900/20";
  };

  /* Mobile fallback — simple grid */
  return (
    <>
      {/* Mobile: plain cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {items.map((item, i) => (
          <div key={i} className="relative rounded-2xl border border-amber-900/20 p-2">
            <GlowingEffect spread={40} glow={true} disabled={false} proximity={64} inactiveZone={0.01} borderWidth={2} />
            <div className="rounded-xl bg-[#070d08] border border-amber-900/20 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/[0.04] border border-amber-900/20">{item.icon}</div>
                <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-amber-950/40 text-amber-400/60 border border-amber-900/20 uppercase tracking-[0.15em]">{item.status}</span>
              </div>
              <div>
                <h3 className="text-white/90 font-semibold text-sm leading-tight">{item.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed mt-1">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: orbital */}
      <div
        ref={containerRef}
        className="relative w-full h-[540px] items-center justify-center cursor-default select-none hidden md:flex"
        onClick={() => { setExpandedId(null); setAutoRotate(true); }}
      >
      {/* Orbit rings */}
      <div className="absolute w-[394px] h-[394px] rounded-full border border-amber-700/30" />
      <div className="absolute w-[420px] h-[420px] rounded-full border border-amber-900/12" />

      {/* Subtle radial gradient background */}
      <div className="absolute w-[320px] h-[320px] rounded-full bg-amber-500/[0.03] blur-2xl pointer-events-none" />

      {/* Center hub */}
      <div className="absolute w-[58px] h-[58px] rounded-full bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 flex items-center justify-center z-10 shadow-[0_0_28px_rgba(245,158,11,0.28)]">
        <motion.div
          className="absolute w-[74px] h-[74px] rounded-full border border-amber-500/25"
          animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
        <motion.div
          className="absolute w-[90px] h-[90px] rounded-full border border-amber-500/12"
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: 0.55 }}
        />
        <Zap className="w-5 h-5 text-black" />
      </div>

      {/* AURA label */}
      <div className="absolute font-mono text-[10px] text-amber-400/40 tracking-[0.3em] uppercase" style={{ marginTop: "76px" }}>
        AURA
      </div>

      {/* Orbital nodes */}
      {items.map((item, index) => {
        const pos = getPosition(index);
        const isExpanded = expandedId === index;
        const cardAbove = pos.y > 30;

        return (
          <div
            key={index}
            className="absolute transition-all duration-700 cursor-pointer"
            style={{
              transform: `translate(${pos.x}px, ${pos.y}px)`,
              zIndex: isExpanded ? 200 : pos.zIdx,
              opacity: isExpanded ? 1 : pos.opacity,
            }}
            onClick={(e) => handleNode(e, index)}
          >
            {/* Pulse ring on expanded */}
            {isExpanded && (
              <motion.div
                className="absolute -inset-3 rounded-full border border-amber-500/35"
                animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
            )}

            {/* Node circle */}
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                ${isExpanded
                  ? "bg-amber-500 border-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.5)] scale-150"
                  : "bg-[#110900] border-amber-700/50 shadow-[0_0_10px_rgba(245,158,11,0.12)] hover:border-amber-500/70 hover:shadow-[0_0_16px_rgba(245,158,11,0.22)]"
                }`}
            >
              <div className={`[&>svg]:w-[18px] [&>svg]:h-[18px] ${isExpanded ? "[&>svg]:text-black" : "[&>svg]:opacity-90"}`}>
                {item.icon}
              </div>
            </div>

            {/* Short title label */}
            <div
              className={`absolute top-[52px] whitespace-nowrap text-[11px] font-mono tracking-wide transition-all duration-300 left-1/2 -translate-x-1/2 text-center
                ${isExpanded ? "text-amber-400 font-semibold" : "text-white/55"}`}
            >
              {item.title.split(" ").slice(0, 2).join(" ")}
            </div>

            {/* Expanded detail card */}
            {isExpanded && (
              <div
                className={`absolute left-1/2 -translate-x-1/2 w-[17rem] bg-[#07040e]/95 backdrop-blur-xl border border-amber-900/30 rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]
                  ${cardAbove ? "bottom-16" : "top-16"}`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Connector */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 w-px bg-amber-500/30
                    ${cardAbove ? "bottom-0 translate-y-full h-4" : "top-0 -translate-y-full h-4"}`}
                />

                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border ${statusColor(item.status ?? "")}`}>
                    {item.status}
                  </span>
                  <span className="text-[10px] font-mono text-white/30">{item.meta}</span>
                </div>

                <h3 className="text-white/90 font-semibold text-sm mb-2 leading-tight">{item.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed mb-3">{item.description}</p>

                <div className="flex gap-1.5 flex-wrap">
                  {item.tags?.map((tag, j) => (
                    <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/25 font-mono border border-amber-900/20">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-amber-900/20 flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-amber-400/60">System Active</span>
                  </div>
                  <span className="text-[10px] text-amber-400/50 font-mono">{item.cta}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Hint when nothing expanded */}
      <AnimatePresence>
        {expandedId === null && (
          <motion.p
            className="absolute bottom-2 text-[10px] font-mono text-white/18 tracking-[0.22em] uppercase pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            Click any node to explore
          </motion.p>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   STATS STRIP
════════════════════════════════════════════════════════════ */
function StatsStrip() {
  const stats = [
    { value: "847K+",  label: "Records Indexed"  },
    { value: "320+",   label: "ZIP Codes Covered" },
    { value: "<2s",    label: "Query Latency"     },
    { value: "Owner", label: "Private AI Access" },
    { value: "GPT-4o-mini", label: "AI Model"     },
    { value: "24/7",   label: "Cluster Uptime"    },
  ];

  return (
    <div className="border-y border-amber-900/20 bg-[#070d08]/80 py-5 overflow-hidden backdrop-blur-sm">
      <div className="flex animate-marquee gap-16 px-8">
        {[...stats, ...stats].map((stat, i) => (
          <div key={i} className="flex items-center gap-3 shrink-0">
            <span className="text-amber-400 font-bold font-mono text-base">{stat.value}</span>
            <span className="text-white/25 text-xs font-mono uppercase tracking-[0.2em]">{stat.label}</span>
            <span className="text-amber-900/60 font-mono">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   COVERAGE STATS
════════════════════════════════════════════════════════════ */
function CoverageStats() {
  const stats = [
    { label: "High Risk ZIPs", value: "12",   color: "text-red-400"   },
    { label: "Medium Risk",    value: "47",   color: "text-amber-400" },
    { label: "Low Risk",       value: "189",  color: "text-green-400" },
    { label: "Total Coverage", value: "320+", color: "text-blue-400"  },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
      {stats.map((s) => (
        <div key={s.label} className="p-4 rounded-xl bg-[#070d08] border border-amber-900/20 text-center">
          <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
          <div className="text-white/25 text-[10px] font-mono uppercase tracking-[0.15em] mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  /* ── Phase ─────────────────────────────────────────────── */
  const [phase, setPhase]                     = useState<Phase>("disclaimer");
  const [disclaimerExiting, setDisclaimerExiting] = useState(false);

  /* ── Query state ───────────────────────────────────────── */
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [question, setQuestion]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [queryCount, setQueryCount] = useState(0);

  /* ── Ambient risk ──────────────────────────────────────── */
  const [ambientRisk, setAmbientRisk] = useState<AmbientRisk>("neutral");

  /* ── Map ───────────────────────────────────────────────── */
  const [mapResults, setMapResults] = useState<QueryResult[]>([]);
  const [mapVisible, setMapVisible] = useState(false);

  /* ── Open App popup ────────────────────────────────────── */
  const [openAppPopup, setOpenAppPopup]   = useState(false);

  /* ── UI ────────────────────────────────────────────────── */
  const [alertVisible, setAlertVisible]   = useState(true);
  const [toastPhase, setToastPhase]       = useState<ToastPhase>("hidden");
  const [openFaq, setOpenFaq]             = useState<number | null>(0);
  const [forceDesktop, setForceDesktop]   = useState(false);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");

  /* ── Refs ──────────────────────────────────────────────── */
  const feedRef           = useRef<HTMLDivElement>(null!);
  const hasToasted        = useRef(false);
  const placeholderIdxRef = useRef(0);
  const charIdxRef        = useRef(0);
  const typingTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Typing placeholder ────────────────────────────────── */
  useEffect(() => {
    if (phase !== "app") return;
    let alive = true;

    const step = () => {
      if (!alive) return;
      const cur = PLACEHOLDER_QUERIES[placeholderIdxRef.current];
      if (charIdxRef.current <= cur.length) {
        setTypedPlaceholder(cur.slice(0, charIdxRef.current));
        charIdxRef.current++;
        typingTimerRef.current = setTimeout(step, 52);
      } else {
        typingTimerRef.current = setTimeout(() => {
          if (!alive) return;
          charIdxRef.current = 0;
          placeholderIdxRef.current = (placeholderIdxRef.current + 1) % PLACEHOLDER_QUERIES.length;
          setTypedPlaceholder("");
          typingTimerRef.current = setTimeout(step, 52);
        }, 2400);
      }
    };
    typingTimerRef.current = setTimeout(step, 900);
    return () => {
      alive = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [phase]);

  /* ── Auto-scroll feed ──────────────────────────────────── */
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [messages]);

  /* ── Phase transitions ─────────────────────────────────── */

  const handleDisclaimerAccept = useCallback(() => {
    setDisclaimerExiting(true);
    setTimeout(() => setPhase("exit"), 480);
    setTimeout(() => setPhase("app"), 1450);
  }, []);

  /* ── Submit query ──────────────────────────────────────── */
  const handleSubmit = useCallback(async () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion("");

    const uid = `u-${Date.now()}`;
    const lid = `l-${Date.now() + 1}`;

    setMessages((prev) => [
      ...prev,
      { id: uid, role: "user", content: q },
      { id: lid, role: "assistant", loading: true },
    ]);
    setLoading(true);
    setQueryCount((c) => c + 1);

    /* Toast — first query only */
    if (!hasToasted.current) {
      hasToasted.current = true;
      setToastPhase("crack");
      setTimeout(() => setToastPhase("open"),    480);
      setTimeout(() => setToastPhase("closing"), 10000);
      setTimeout(() => setToastPhase("hidden"),  10500);
    }

    try {
      const res = await fetch("/api/query", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(res.status === 401 ? "Owner access required" : `HTTP ${res.status}`);
      const data = await res.json();
      const results: QueryResult[] = data.results ?? [];
      const answer:  string        = data.answer  ?? "";

      setMessages((prev) =>
        prev.filter((m) => m.id !== lid).concat({ id: `a-${Date.now()}`, role: "assistant", results, answer })
      );

      if (results.length > 0) {
        const avg = results.reduce((s, r) => s + (r.priority_score ?? 0), 0) / results.length;
        setAmbientRisk(avg >= 50 ? "critical" : avg >= 20 ? "elevated" : "nominal");

        const hasZips = results.some((r) => r.zip_code && ZIP_COORDS[r.zip_code]);
        if (hasZips) {
          setMapResults(results);
          setMapVisible(true);
          setTimeout(() => document.getElementById("aura-map")?.scrollIntoView({ behavior: "smooth" }), 450);
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.filter((m) => m.id !== lid).concat({
          id:      `e-${Date.now()}`,
          role:    "assistant",
          answer: error instanceof Error && error.message === "Owner access required" ? "AI queries are private. Use Owner access above the terminal to unlock them." : "Query unavailable. Try a city, ZIP, or ranking question after unlocking Owner access.",
          results: [],
        })
      );
    } finally {
      setLoading(false);
    }
  }, [question, loading]);

  /* ── Example query click ───────────────────────────────── */
  const handleExampleClick = useCallback((q: string) => {
    setQuestion(q);
    document.getElementById("terminal")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* ── Ambient glow style ────────────────────────────────── */
  const glowStyle = {
    neutral:  "transparent",
    critical: "radial-gradient(ellipse 80% 45% at 50% 0%, rgba(239,68,68,0.09), transparent)",
    elevated: "radial-gradient(ellipse 80% 45% at 50% 0%, rgba(234,179,8,0.08), transparent)",
    nominal:  "radial-gradient(ellipse 80% 45% at 50% 0%, rgba(245,158,11,0.07), transparent)",
  }[ambientRisk];

  const riskBadgeMap = {
    critical: { label: "CRITICAL", cls: "bg-red-500/15 text-red-400 border-red-500/25"         },
    elevated: { label: "ELEVATED", cls: "bg-amber-500/15 text-amber-400 border-amber-500/25"   },
    nominal:  { label: "NOMINAL",  cls: "bg-green-500/15 text-green-400 border-green-500/25"   },
  } as const;

  /* ── Pre-entry screens ─────────────────────────────────── */
  if (phase === "disclaimer") {
    return (
      <div style={{ background: "#02040A", minHeight: "100vh" }}>
        <DisclaimerScreen onAccept={handleDisclaimerAccept} isExiting={disclaimerExiting} />
      </div>
    );
  }

  if (phase === "exit") {
    return (
      <div style={{ background: "#02040A", minHeight: "100vh" }}>
        <AnimatePresence>
          <LoadingScreen key="loading" />
        </AnimatePresence>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     MAIN APP
  ════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen text-white overflow-x-hidden">

      {/* ── Global ambient shader background (z-0) ──────── */}
      <GlobalShader />

      {/* ── Ambient risk glow overlay (z-2) ─────────────── */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 2 }}
        animate={{ background: glowStyle }}
        transition={{ duration: 3, ease: "easeInOut" }}
      />

      {/* ── Main content — above all backgrounds (z-10) ──── */}
      <div className="relative" style={{ zIndex: 10 }}>

        {/* ── Navbar badges overlay ─────────────────────── */}
        <AnimatePresence>
          {(queryCount > 0 || ambientRisk !== "neutral") && (
            <motion.div
              className="hidden md:flex fixed top-5 right-4 z-[10000] items-center gap-2 pt-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {queryCount > 0 && (
                <motion.div
                  className="px-2.5 py-1 rounded-full bg-[#070d08] border border-amber-900/20 text-white/50 text-xs font-mono"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320 }}
                >
                  {queryCount}Q
                </motion.div>
              )}
              {ambientRisk !== "neutral" && riskBadgeMap[ambientRisk] && (
                <motion.div
                  className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold ${riskBadgeMap[ambientRisk].cls}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320 }}
                >
                  {riskBadgeMap[ambientRisk].label}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Navbar ──────────────────────────────────────── */}
        <AnimeNavBar
          items={[
            { name: "Home",     url: "#hero",     icon: Home     },
            { name: "Features", url: "#features", icon: BarChart3 },
            { name: "Map",      url: "#coverage", icon: MapPin    },
            { name: "Ask AI",   url: "#query",    icon: Terminal  },
            { name: "Open App", url: "#",         icon: Zap,       onSpecialClick: () => setOpenAppPopup(true) },
          ]}
          defaultActive="Home"
        />

        {/* ── Lightning Hero ──────────────────────────────── */}
        <section id="hero">
          <LightningHero />
        </section>

        {/* ── Stats Ticker ────────────────────────────────── */}
        <StatsStrip />

        {/* ── Scroll Animation ────────────────────────────── */}
        <section className="relative bg-gradient-to-b from-[#02040A]/65 via-[#02040A]/50 to-transparent overflow-hidden">
          <ContainerScroll
            titleComponent={
              <div className="text-center px-4 space-y-3">
                <span className="text-xs font-mono tracking-[0.3em] uppercase text-amber-400/60">
                  Powered by Databricks + GPT-4o-mini
                </span>
                <h2 className="text-4xl md:text-5xl font-bold text-white mt-3 tracking-tight leading-tight">
                  Ask questions about
                  <br />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-400">
                    Phoenix safety data
                  </span>
                </h2>
                <p className="text-sm text-white/40 font-mono mt-4 max-w-xl mx-auto">
                  Natural language → validated plan → ranked results
                </p>
              </div>
            }
          >
            <AuraDashboardPreview />
          </ContainerScroll>
        </section>

        {/* ── Features ────────────────────────────────────── */}
        <Section id="features">
          <SectionLabel
            tag="Capabilities"
            title="Built for Urban Intelligence"
            subtitle="Every feature designed to turn raw crime data into actionable safety intelligence."
          />
          <AuraFeaturesGrid items={featureItems} />
        </Section>

        {/* ── Coverage ────────────────────────────────────── */}
        <Section id="coverage">
          <SectionLabel
            tag="Coverage Area"
            title="Phoenix Metro Region"
            subtitle="Full coverage of 320+ ZIP codes across Phoenix, Mesa, Tempe, Scottsdale, and surrounding cities."
          />
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20">
            <div className="flex flex-col items-center gap-8">
              <LocationMap
                location="Phoenix Metro, AZ"
                coordinates="33.4484° N, 112.0740° W"
              />
              <p className="text-white/25 font-mono text-[10px] tracking-[0.2em] uppercase text-center">
                Click map to expand coverage grid
              </p>
            </div>
            <div className="flex flex-col gap-6 w-full max-w-sm">
              <AlertCard
                isVisible={alertVisible}
                title="High Risk Zone"
                description="ZIP 85034 has a priority score of 94/100 — highest in the Phoenix metro. Exercise caution for retail site selection in this area."
                buttonText="View Full Analysis"
                onButtonClick={() => setAlertVisible(false)}
                onDismiss={() => setAlertVisible(false)}
                icon={<AlertTriangle className="h-6 w-6 text-red-200" />}
              />
              {!alertVisible && (
                <button
                  onClick={() => setAlertVisible(true)}
                  className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400/40 hover:text-amber-400 transition-colors text-center"
                >
                  Show risk alert demo
                </button>
              )}
              <CoverageStats />
            </div>
          </div>
        </Section>

        {/* ── Example Queries ──────────────────────────────── */}
        <Section id="examples">
          <SectionLabel
            tag="Try It Out"
            title="Example Queries"
            subtitle="Click any query to auto-fill the terminal below."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {EXAMPLE_QUERIES.map((q, i) => (
              <ScrollReveal key={i} delay={i * 0.05}>
                <motion.button
                  onClick={() => handleExampleClick(q)}
                  className="w-full text-left px-5 py-4 rounded-xl border border-amber-900/20 bg-[#070d08] hover:bg-amber-950/30 hover:border-amber-800/30 transition-all group"
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-white/50 text-sm group-hover:text-white/80 transition-colors font-mono">{q}</span>
                    <ArrowRight className="w-4 h-4 text-amber-400/20 group-hover:text-amber-400/60 transition-colors flex-shrink-0" />
                  </div>
                </motion.button>
              </ScrollReveal>
            ))}
          </div>
        </Section>

        {/* ── AI Query ─────────────────────────────────────── */}
        <section id="query" className="relative overflow-hidden">
          <div className="relative z-10 pt-14 px-4 md:pt-28 md:px-6">
            <div className="max-w-6xl mx-auto w-full">
              <SectionLabel
                tag="AI Interface"
                title="Query Risk Data"
                subtitle="Explore the public demo. AI queries are available through private Owner access."
              />
            </div>
          </div>

          <div className="relative pb-16" id="terminal">
            <OwnerAccess />
            <QueryTerminal
              messages={messages}
              loading={loading}
              question={question}
              setQuestion={setQuestion}
              onSubmit={handleSubmit}
              feedRef={feedRef}
              typedPlaceholder={typedPlaceholder}
            />
          </div>
        </section>

        {/* ── Risk Map (conditional) ───────────────────────── */}
        <AnimatePresence>
          {mapVisible && <RiskMapSection key="map" mapResults={mapResults} />}
        </AnimatePresence>

        {/* ── FAQ ──────────────────────────────────────────── */}
        <Section id="faq">
          <SectionLabel
            tag="Common Questions"
            title="How It Works"
            subtitle="Everything you need to know before querying the city."
          />
          <div className="max-w-3xl mx-auto space-y-0">
            {FAQ_ITEMS.map((item, i) => (
              <ScrollReveal key={i} delay={i * 0.06}>
                <div
                  className="border-b border-amber-900/20 cursor-pointer"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <div className="flex items-center justify-between py-5 gap-4">
                    <span className="text-white/70 font-medium text-sm md:text-base leading-snug font-mono">
                      {item.q}
                    </span>
                    <motion.div
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.22 }}
                      className="flex-shrink-0"
                    >
                      <ChevronDown className="w-5 h-5 text-amber-400/30" />
                    </motion.div>
                  </div>
                  <AnimatePresence initial={false}>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="text-white/40 text-sm pb-5 leading-relaxed font-mono">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </Section>

        {/* ── System Info ──────────────────────────────────── */}
        <Section id="system">
          <SectionLabel
            tag="Infrastructure"
            title="Built on Real Infrastructure"
            subtitle="Three layers working together to turn raw data into risk intelligence."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: MessageSquare, title: "AI Engine",  color: "text-amber-400",  desc: "GPT-4o-mini proposes structured intent. The server validates it and owns every SQL template and parameter." },
              { icon: Database,      title: "Databricks", color: "text-blue-400",   desc: "Six approved urban datasets served through bounded queries, with named parameters and up to 20 results." },
              { icon: BarChart3,     title: "Risk Index", color: "text-orange-400", desc: "Normalized 0-100 priority score combining crime density, population, and social vulnerability data." },
            ].map((item, i) => (
              <ScrollReveal key={item.title} delay={i * 0.09}>
                <GlowCard className="rounded-2xl h-full">
                  <div className="p-6 bg-[#070d08] border border-amber-900/20 rounded-2xl h-full hover:-translate-y-0.5 transition-transform">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-amber-900/20 flex items-center justify-center mb-4">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2 font-mono">{item.title}</h3>
                    <p className="text-white/40 text-sm leading-relaxed font-mono">{item.desc}</p>
                  </div>
                </GlowCard>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal delay={0.3}>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { Icon: Zap,     label: "Processing",  value: "Instant"    },
                { Icon: Shield,  label: "Security",    value: "Owner-only" },
                { Icon: Network, label: "Integration", value: "GPT-4o"     },
                { Icon: Lock,    label: "Guardrails",  value: "Templates"  },
                { Icon: Cpu,     label: "Cluster",     value: "Databricks" },
                { Icon: Search,  label: "Records",     value: "847K+"      },
              ].map(({ Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 p-4 bg-[#070d08] border border-amber-900/20 rounded-xl">
                  <div className="w-8 h-8 rounded-lg border border-amber-900/20 bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-amber-400/60" />
                  </div>
                  <div>
                    <p className="text-white/25 text-[10px] font-mono uppercase tracking-wider">{label}</p>
                    <p className="text-white/80 font-semibold text-sm font-mono">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </Section>

        {/* ── Beta Notes ───────────────────────────────────── */}
        <Section id="beta">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <GlowCard className="rounded-3xl">
                <div className="p-8 md:p-12 bg-[#070d08] border border-amber-900/20 rounded-3xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/[0.07] border border-amber-500/15 text-amber-400/60 text-[10px] font-mono uppercase tracking-wider mb-6">
                    Beta v0.1
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 tracking-tight">Rough Edges. Real Data.</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-white/25 text-[10px] font-mono uppercase tracking-widest mb-5">Known Limitations</h4>
                      {[
                        "Queries may fail or time out",
                        "AI may misinterpret ambiguous questions",
                        "Cluster spinup can cause initial delays",
                        "Data is indexed, not a live feed",
                        "Not for real operational decisions",
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5 mb-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                          <span className="text-white/40 text-sm font-mono">{item}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-white/25 text-[10px] font-mono uppercase tracking-widest mb-5">Best Practices</h4>
                      {[
                        "Ask one focused question at a time",
                        "Include city name or ZIP code context",
                        "Use superlatives: highest, lowest, most",
                        "Rephrase if results seem unexpected",
                        "Research purposes only",
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2.5 mb-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                          <span className="text-white/40 text-sm font-mono">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlowCard>
            </ScrollReveal>
          </div>
        </Section>

        {/* ── About ────────────────────────────────────────── */}
        <Section id="about">
          <SectionLabel tag="The Builder" title="Built by Zain Shah" />
          <div className="max-w-3xl mx-auto">
            <ScrollReveal delay={0.1}>
              <GlowCard className="rounded-3xl">
                <div className="p-8 bg-[#070d08] border border-amber-900/20 rounded-3xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-black font-black text-2xl flex-shrink-0">
                      Z
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-xl font-mono">Zain Shah</h3>
                      <p className="text-white/35 text-sm font-mono">CS @ Arizona State University · Class of 2028</p>
                    </div>
                  </div>

                  <p className="text-white/45 text-sm leading-relaxed mb-6 font-mono">
                    AURA is a full-stack urban risk intelligence platform built to explore the intersection of AI, data engineering, and civic technology. Using Databricks for scalable compute, OpenAI for language understanding, and Next.js for the interface, AURA transforms complex urban datasets into accessible risk intelligence for researchers and analysts.
                  </p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {["Python", "Next.js", "TypeScript", "Databricks", "OpenAI API", "React"].map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-white/[0.04] border border-amber-900/20 text-white/50 text-xs font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/20 mb-6">
                    <p className="text-white/25 text-[10px] font-mono uppercase tracking-widest mb-1.5">What AURA Means</p>
                    <p className="text-white/75 text-sm font-semibold font-mono">Automated Urban Risk Analytics</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {[
                      { href: "https://github.com/SikeTheMike",                 Icon: Github,   label: "GitHub"   },
                      { href: "https://linkedin.com/in/zain-sahir-s-4b1a9a227", Icon: Linkedin, label: "LinkedIn" },
                      { href: "mailto:shahzain.zeza@gmail.com",                 Icon: Mail,     label: "Email"    },
                    ].map(({ href, Icon, label }) => (
                      <a
                        key={label}
                        href={href}
                        target={label !== "Email" ? "_blank" : undefined}
                        rel={label !== "Email" ? "noopener noreferrer" : undefined}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-amber-900/20 text-white/50 text-sm hover:border-amber-800/30 hover:text-white/75 transition-all font-mono"
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </a>
                    ))}
                  </div>
                </div>
              </GlowCard>
            </ScrollReveal>
          </div>
        </Section>

        {/* ── Bottom Dock ──────────────────────────────────── */}
        <div className="border-t border-amber-900/20 bg-[#02040A]/60 py-16">
          <div className="flex flex-col items-center gap-4 max-w-6xl mx-auto px-6">
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/25">
              Quick Navigation
            </span>
            <Dock direction="middle" magnification={52} distance={120}>
              <DockIcon onClick={() => document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" })}>
                <Home    className="size-5 text-white/40 hover:text-white transition-colors" />
              </DockIcon>
              <DockIcon onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
                <BarChart3 className="size-5 text-amber-400/60 hover:text-amber-400 transition-colors" />
              </DockIcon>
              <DockIcon onClick={() => document.getElementById("coverage")?.scrollIntoView({ behavior: "smooth" })}>
                <MapPin  className="size-5 text-blue-400/60 hover:text-blue-400 transition-colors" />
              </DockIcon>
              <DockIcon onClick={() => document.getElementById("query")?.scrollIntoView({ behavior: "smooth" })}>
                <Terminal className="size-5 text-purple-400/60 hover:text-purple-400 transition-colors" />
              </DockIcon>
              <DockIcon onClick={() => document.getElementById("examples")?.scrollIntoView({ behavior: "smooth" })}>
                <Search  className="size-5 text-amber-400/60 hover:text-amber-400 transition-colors" />
              </DockIcon>
              <DockIcon onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>
                <Globe   className="size-5 text-white/25 hover:text-white/60 transition-colors" />
              </DockIcon>
            </Dock>
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <Footer
          brandName="AURA"
          brandDescription="Automated Urban Risk Analytics — AI-powered safety intelligence for the Phoenix metro area."
          socialLinks={socialLinks}
          navLinks={footerNavLinks}
          creatorName="Urban AI Labs"
          creatorUrl="#"
          brandIcon={
            <Zap className="w-8 sm:w-10 md:w-14 h-8 sm:h-10 md:h-14 text-black drop-shadow-lg" />
          }
        />
      </div>

      {/* ── Floating UI ─────────────────────────────────────── */}
      <Toast phase={toastPhase} onDismiss={() => setToastPhase("hidden")} />
      <ViewToggle forceDesktop={forceDesktop} setForceDesktop={setForceDesktop} />

      {/* ── Open App Popup ──────────────────────────────────── */}
      <AnimatePresence>
        {openAppPopup && (
          <motion.div
            className="fixed inset-0 z-[99999] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenAppPopup(false)}
          >
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* card */}
            <motion.div
              className="relative z-10 bg-[#070d08] border border-amber-900/30 rounded-3xl p-8 max-w-sm w-[90vw] text-center shadow-2xl shadow-amber-950/40"
              initial={{ scale: 0.7, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.7, y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* close */}
              <button
                onClick={() => setOpenAppPopup(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white/40" />
              </button>

              {/* crying emoji */}
              <motion.div
                className="text-6xl mb-4 inline-block"
                animate={{ rotate: [0, -8, 8, -8, 8, 0], y: [0, -4, 0, -4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.2 }}
              >
                😭
              </motion.div>

              {/* tears dripping */}
              <motion.div
                className="text-2xl mb-3 inline-block"
                animate={{ opacity: [0, 1, 0], y: [0, 8, 16] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.4 }}
              >
                💧💧
              </motion.div>

              <h3 className="text-white font-bold text-xl font-mono mb-2">
                app? what app?
              </h3>
              <p className="text-white/40 text-sm font-mono leading-relaxed mb-5">
                we lied. there&apos;s no app yet.<br />
                we&apos;re building it, we promise 🤞<br />
                (probably)
              </p>

              <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400/70 text-xs font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>coming soon™</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
