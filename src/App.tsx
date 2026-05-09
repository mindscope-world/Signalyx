import { useState, useEffect } from 'react';
import { Search, Activity, Target, Zap, LayoutDashboard, BrainCircuit, RefreshCw, BarChart2, Bell, User, Mouse, Facebook, Instagram, Twitter, ChevronDown, ChevronRight, ZapOff, ArrowUpRight, TrendingUp, AlertTriangle, Lightbulb, FileText, Globe, Link2, Info, Flag } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Input } from './components/ui/input';

export default function App() {
  const [activeView, setActiveView] = useState<'explore' | 'dashboards' | 'queries' | 'create'>('explore');
  const [niche, setNiche] = useState('');
  const [currentNiche, setCurrentNiche] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  const [dashboardsList, setDashboardsList] = useState<any[]>([]);
  const [queriesList, setQueriesList] = useState<any[]>([]);

  // Create Page State
  const [createTopic, setCreateTopic] = useState('');
  const [createPlatform, setCreatePlatform] = useState('Website');
  const [createContentType, setCreateContentType] = useState<'Post' | 'Comment'>('Post');
  const [createTone, setCreateTone] = useState('Professional');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchRecentQueries();
  }, []);

  useEffect(() => {
    if (activeView === 'dashboards') {
      fetchDashboardsList();
    } else if (activeView === 'queries') {
      fetchQueriesList();
    }
  }, [activeView]);

  const fetchDashboardsList = async () => {
    try {
      const res = await fetch('/api/dashboards');
      if (res.ok) setDashboardsList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQueriesList = async () => {
    try {
      const res = await fetch('/api/queries');
      if (res.ok) setQueriesList(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecentQueries = async () => {
    try {
      const res = await fetch('/api/recent_niches');
      if (res.ok) setRecentQueries(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboard = async (targetNiche: string) => {
    try {
      const res = await fetch(`/api/dashboard/${encodeURIComponent(targetNiche)}`);
      if (res.ok) {
        const json = await res.json();
        // Check if strategy data object is populated
        if (json && Object.keys(json).length > 0 && json.demand_intelligence) {
          setData(json);
        } else {
           if (!isProcessing) {
             setData(null);
             alert("Pipeline completed, but no signals were extracted.");
           }
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRunPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche) return;
    setIsProcessing(true);
    setCurrentNiche(niche);
    setData(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche })
      });
      const result = await res.json();
      
      if (result.queryId) {
        pollStatus(result.queryId, niche);
      } else {
        await fetchDashboard(niche);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };

  const pollStatus = async (queryId: string, targetNiche: string) => {
    try {
      const res = await fetch(`/api/status/${queryId}`);
      const statusData = await res.json();
      
      if (statusData.status === 'completed') {
        await fetchDashboard(targetNiche);
        fetchRecentQueries();
        setIsProcessing(false);
      } else if (statusData.status === 'failed') {
        alert("Pipeline failed to process niche: " + (statusData.error_message || "Unknown error. Check console."));
        setIsProcessing(false);
      } else {
        setTimeout(() => pollStatus(queryId, targetNiche), 2000);
      }
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    }
  };

  const handleGenerateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTopic || !createPlatform) return;
    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const res = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          topic: createTopic, 
          platform: createPlatform, 
          tone: createTone,
          contentType: createContentType,
          seoContext: data
        })
      });
      const result = await res.json();
      if (result.content) {
        setGeneratedContent(result.content);
      } else {
        alert("Content generation failed: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error generating content.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neo-bg font-sans text-stone-900 flex overflow-hidden">
      
      {/* Left Vertical Navigation */}
      <nav className="w-24 border-r border-transparent flex flex-col justify-between items-center py-8 z-10 hidden md:flex shrink-0">
        <div className="flex flex-col items-center gap-16 mt-16 relative">
          <div className="absolute top-0 w-12 h-32 bg-white/40 neo-flat rounded-full -z-10 blur-sm"></div>
          <button 
            onClick={() => setActiveView('explore')}
            className={`-rotate-90 whitespace-nowrap font-semibold tracking-wide text-sm px-6 py-2 rounded-full transition-all ${activeView === 'explore' ? 'text-stone-800 neo-btn' : 'text-stone-500 hover:text-stone-800'}`}>
            Explore
          </button>
          <button 
            onClick={() => setActiveView('create')}
            className={`-rotate-90 whitespace-nowrap font-semibold tracking-wide text-sm px-6 py-2 rounded-full transition-all ${activeView === 'create' ? 'text-stone-800 neo-btn' : 'text-stone-500 hover:text-stone-800'}`}>
            Create
          </button>
          <button 
            onClick={() => setActiveView('dashboards')}
            className={`-rotate-90 whitespace-nowrap font-semibold tracking-wide text-sm px-6 py-2 rounded-full transition-all ${activeView === 'dashboards' ? 'text-stone-800 neo-btn' : 'text-stone-500 hover:text-stone-800'}`}>
            Dashboards
          </button>
          <button 
            onClick={() => setActiveView('queries')}
            className={`-rotate-90 whitespace-nowrap font-semibold tracking-wide text-sm px-6 py-2 rounded-full transition-all ${activeView === 'queries' ? 'text-stone-800 neo-btn' : 'text-stone-500 hover:text-stone-800'}`}>
            Queries
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto w-full relative">
        {/* Header */}
        <header className="px-6 md:px-12 py-8 flex items-center justify-between w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveView('explore')}>
            <div className="w-12 h-12 rounded-full neo-flat flex items-center justify-center p-2 group-hover:neo-pressed transition-all">
              <BrainCircuit className="w-6 h-6 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-800">Signalyx</h1>
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 pb-24 relative z-0">
          
          {activeView === 'explore' && (
            <>
              {/* Hero Section */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-12 mt-4 lg:mt-12 mb-16">
                <div className="flex-1 space-y-8 max-w-xl">
                  <h2 className="text-5xl lg:text-7xl font-bold tracking-tighter text-stone-800 leading-[1.1]">
                    SEO <br/><span className="text-stone-600">Intelligence</span>
                  </h2>
                  <p className="text-stone-500 text-lg leading-relaxed font-medium">
                    Type a keyword. Get a full SEO strategy.<br/> Turn search demand into growth.
                  </p>
                  
                  <form onSubmit={handleRunPipeline} className="mt-8 flex flex-col sm:flex-row items-center gap-6 w-full max-w-lg">
                    <div className="w-full neo-pressed rounded-full px-6 py-4 flex items-center gap-3">
                      <Search className="w-5 h-5 text-stone-400 shrink-0" />
                      <Input 
                        placeholder="e.g. diabetes treatment" 
                        className="border-none shadow-none bg-transparent focus-visible:ring-0 text-base h-auto py-0 text-stone-600 placeholder:text-stone-400"
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        disabled={isProcessing}
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isProcessing || !niche} 
                      className="neo-btn rounded-full px-8 py-4 font-semibold text-stone-700 flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center group"
                    >
                      {isProcessing ? (
                        <><RefreshCw className="w-5 h-5 animate-spin" /> Mining...</>
                      ) : (
                        <><Zap className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" /> Run Engine</>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Loading State Simulator */}
              {isProcessing && (
                <div className="neo-flat rounded-[2rem] p-12 text-center max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 mb-16">
                  <div className="w-24 h-24 mx-auto neo-pressed rounded-full flex items-center justify-center mb-8 relative overflow-hidden">
                    <BrainCircuit className="w-10 h-10 text-amber-500 animate-pulse relative z-10" />
                  </div>
                  <h3 className="text-3xl font-bold text-stone-800 mb-4 animate-pulse">Running Intelligence Engine...</h3>
                  <div className="space-y-3 max-w-md mx-auto text-stone-500 font-medium">
                    <p className="flex items-center justify-between"><span className="flex items-center gap-2"><Target className="w-4 h-4"/> Parsing search behavior</span> <span className="text-emerald-500">Done</span></p>
                    <p className="flex items-center justify-between"><span className="flex items-center gap-2"><Globe className="w-4 h-4"/> Breaking down SERP</span> <span className="text-amber-500 animate-pulse">Running</span></p>
                  </div>
                </div>
              )}

              {/* DASHBOARD DISPLAY */}
              {data && !isProcessing && (
                <div className="space-y-12 animate-in fade-in duration-700 mt-12">
                  <div className="flex items-center gap-6 pb-4 border-b border-white/20">
                    <h2 className="text-4xl font-black tracking-tight text-stone-800 uppercase">Strategy Report: {currentNiche}</h2>
                  </div>

                  {/* 1. Demand & 5. Opportunity */}
                  <div className="grid lg:grid-cols-2 gap-8">
                    <div className="neo-flat rounded-[2rem] p-8">
                       <h3 className="flex items-center gap-3 text-2xl font-bold text-stone-800 mb-8"><BarChart2 className="text-blue-500"/> 1. Demand Intelligence</h3>
                       <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="neo-pressed p-4 rounded-xl">
                            <p className="text-sm font-bold text-stone-500 mb-1">Total Volume</p>
                            <p className="text-3xl font-bold text-blue-600">{data.demand_intelligence?.total_search_volume}</p>
                            <span className="flex items-center gap-1 text-xs text-stone-400 mt-1"><Info className="w-3 h-3"/> AI-estimated</span>
                          </div>
                          <div className="neo-pressed p-4 rounded-xl">
                            <p className="text-sm font-bold text-stone-500 mb-1">Trend</p>
                            <p className="text-3xl font-bold text-emerald-600 flex items-center gap-2">{data.demand_intelligence?.trend} <TrendingUp className="w-6 h-6"/></p>
                            <span className="flex items-center gap-1 text-xs text-stone-400 mt-1"><Info className="w-3 h-3"/> AI-estimated</span>
                          </div>
                          <div className="col-span-2 neo-pressed p-4 rounded-xl">
                            <p className="text-sm font-bold text-stone-500 mb-2">Demand Stability</p>
                            <span className="neo-flat px-4 py-1.5 rounded-full text-sm font-bold text-stone-700">{data.demand_intelligence?.demand_stability}</span>
                          </div>
                       </div>
                       
                       <h4 className="font-bold text-stone-700 mb-4">Top Rising Queries</h4>
                       <Table className="mb-6">
                         <TableHeader>
                           <TableRow className="border-b-0">
                             <TableHead className="font-bold text-stone-500">Query</TableHead>
                             <TableHead className="font-bold text-stone-500">Growth</TableHead>
                             <TableHead className="font-bold text-stone-500">Intent</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {data.demand_intelligence?.top_queries?.map((q: any, i: number) => (
                             <TableRow key={i} className="hover:bg-transparent">
                               <TableCell className="font-semibold text-stone-800">{q.query}</TableCell>
                               <TableCell className="font-mono text-emerald-600 font-bold">{q.growth}</TableCell>
                               <TableCell className="font-medium text-stone-500">{q.intent}</TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                       <div className="bg-amber-100/50 p-4 rounded-xl border border-amber-200">
                          <p className="text-sm font-bold text-amber-800 mb-1">💡 Demand Insight:</p>
                          <p className="text-amber-900 font-medium leading-relaxed">{data.demand_intelligence?.insight}</p>
                       </div>
                    </div>

                    <div className="neo-flat rounded-[2rem] p-8 flex flex-col">
                       <h3 className="flex items-center gap-3 text-2xl font-bold text-stone-800 mb-8"><Target className="text-rose-500"/> 5. Opportunity Scoring</h3>
                       <div className="flex items-end gap-6 mb-8 neo-pressed p-6 rounded-2xl">
                          <div className="flex-1 text-center">
                            <p className="text-sm font-bold text-stone-500 mb-2">Demand</p>
                            <p className="text-4xl font-bold text-blue-500">{data.opportunity_scoring?.demand_score}</p>
                          </div>
                          <div className="flex-1 text-center">
                            <p className="text-sm font-bold text-stone-500 mb-2">Competition</p>
                            <p className="text-4xl font-bold text-rose-500">{data.opportunity_scoring?.competition_score}</p>
                          </div>
                          <div className="flex-1 text-center neo-flat p-4 rounded-xl">
                            <p className="text-sm font-bold text-emerald-600 mb-2 uppercase">Opportunity</p>
                            <p className="text-5xl font-black text-emerald-500">{data.opportunity_scoring?.opportunity_score}</p>
                          </div>
                       </div>

                       <h4 className="font-bold text-stone-700 mb-4">High-ROI Keyword Targets</h4>
                       <div className="flex-1 space-y-3 mb-6">
                         {data.opportunity_scoring?.high_roi_keywords?.map((kw: any, i: number) => (
                           <div key={i} className="flex justify-between items-center bg-white/50 p-4 rounded-xl">
                             <span className="font-bold text-stone-800">{kw.keyword}</span>
                             <span className="neo-pressed px-4 py-1 rounded-full text-emerald-600 font-black font-mono">{kw.score} Score</span>
                           </div>
                         ))}
                       </div>

                       <div className="bg-emerald-100/50 p-4 rounded-xl border border-emerald-200 mt-auto">
                          <p className="text-sm font-bold text-emerald-800 mb-1">💡 Opportunity Insight:</p>
                          <p className="text-emerald-900 font-medium leading-relaxed">{data.opportunity_scoring?.insight}</p>
                       </div>
                    </div>
                  </div>

                  {/* 2. Intent & 4. Competition */}
                  <div className="grid lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-2 neo-flat rounded-[2rem] p-8">
                       <h3 className="flex items-center gap-3 text-2xl font-bold text-stone-800 mb-8"><Activity className="text-purple-500"/> 2. Search Intent</h3>
                       <div className="space-y-6 mb-8">
                         <div>
                           <div className="flex justify-between font-bold mb-2 text-stone-700">
                             <span>Informational</span> <span>{data.search_intent?.informational_pct}%</span>
                           </div>
                           <div className="h-4 bg-stone-200 rounded-full overflow-hidden">
                             <div className="h-full bg-blue-400 rounded-full" style={{ width: `${data.search_intent?.informational_pct}%` }}></div>
                           </div>
                         </div>
                         <div>
                           <div className="flex justify-between font-bold mb-2 text-stone-700">
                             <span>Commercial</span> <span>{data.search_intent?.commercial_pct}%</span>
                           </div>
                           <div className="h-4 bg-stone-200 rounded-full overflow-hidden">
                             <div className="h-full bg-amber-400 rounded-full" style={{ width: `${data.search_intent?.commercial_pct}%` }}></div>
                           </div>
                         </div>
                         <div>
                           <div className="flex justify-between font-bold mb-2 text-stone-700">
                             <span>Transactional</span> <span>{data.search_intent?.transactional_pct}%</span>
                           </div>
                           <div className="h-4 bg-stone-200 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${data.search_intent?.transactional_pct}%` }}></div>
                           </div>
                         </div>
                       </div>
                       <div className="bg-purple-100/50 p-4 rounded-xl border border-purple-200">
                          <p className="text-sm font-bold text-purple-800 mb-1">💡 Intent Interpretation:</p>
                          <p className="text-purple-900 font-medium leading-relaxed">{data.search_intent?.insight}</p>
                       </div>
                    </div>

                     <div className="lg:col-span-3 neo-flat rounded-[2rem] p-8">
                         <div className="flex justify-between items-start mb-8">
                           <h3 className="flex items-center gap-3 text-2xl font-bold text-stone-800"><Globe className="text-indigo-500"/> 4. Competitive Landscape</h3>
                           <div className="flex gap-2">
                             <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded shadow-sm">SIOS Module A Active</span>
                             <span className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded shadow-sm">SIOS Module B Active</span>
                           </div>
                         </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                           {/* SIOS Module A - AI Visibility Score */}
                           <div className="bg-indigo-950 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between">
                              <h4 className="text-[10px] uppercase tracking-widest font-black text-indigo-300">AI Visibility Score</h4>
                              <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black">{data.competitive_landscape?.ai_visibility_score || 0}</span>
                                <span className="text-indigo-400 font-bold">/100</span>
                              </div>
                              <p className="text-[10px] text-indigo-200 leading-tight mt-4">Likelihood of brand citation in Generative AI responses (Perplexity, ChatGPT, Gemini).</p>
                           </div>

                           {/* AI Citation Sentiment */}
                           <div className="bg-stone-100 p-6 rounded-2xl border-2 border-stone-800">
                             <h4 className="text-[10px] uppercase tracking-widest font-black text-stone-500 mb-4">Citation Sentiment</h4>
                             <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${data.competitive_landscape?.citation_sentiment === 'Positive' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}></div>
                                <span className="text-2xl font-black text-stone-800">{data.competitive_landscape?.citation_sentiment || 'Neutral'}</span>
                             </div>
                             <p className="text-[10px] text-stone-500 leading-tight mt-4 italic">Analysis of contextual brand positioning in AI simulation.</p>
                           </div>

                           {/* AI-Cited Competitors */}
                           <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-stone-300">
                              <h4 className="text-[10px] uppercase tracking-widest font-black text-stone-500 mb-4">AI-Cited Competitors</h4>
                              <ul className="flex flex-wrap gap-2">
                                {data.competitive_landscape?.ai_cited_competitors?.map((comp: string, i: number) => (
                                  <li key={i} className="bg-stone-800 text-white text-[11px] font-bold px-2 py-1 rounded">{comp}</li>
                                ))}
                              </ul>
                           </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6 mb-8">
                         <div className="neo-pressed p-6 rounded-2xl">
                           <h4 className="font-bold text-stone-500 uppercase text-sm tracking-widest mb-4">Top Domains</h4>
                           <ul className="space-y-2">
                             {data.competitive_landscape?.top_domains?.map((domain: string, i: number) => (
                               <li key={i} className="font-mono text-stone-800 font-medium flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-stone-400"/> {domain}</li>
                             ))}
                           </ul>
                         </div>
                         <div className="neo-pressed p-6 rounded-2xl">
                           <h4 className="font-bold text-stone-500 uppercase text-sm tracking-widest mb-4">SERP Characteristics</h4>
                           <ul className="space-y-2">
                             {data.competitive_landscape?.serp_characteristics?.map((char: string, i: number) => (
                               <li key={i} className="text-stone-700 font-medium border-b border-stone-200/50 pb-2">{char}</li>
                             ))}
                           </ul>
                         </div>
                       </div>

                       <h4 className="font-bold text-stone-700 mb-4">Content Gap Analysis</h4>
                       <Table className="mb-6">
                         <TableHeader>
                           <TableRow className="border-b-0">
                             <TableHead className="font-bold text-stone-500">Gap Area</TableHead>
                             <TableHead className="font-bold text-stone-500">Opportunity</TableHead>
                             <TableHead className="font-bold text-stone-500">Practical Action</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {data.competitive_landscape?.content_gaps?.map((gap: any, i: number) => (
                             <TableRow key={i} className="hover:bg-transparent">
                               <TableCell className="font-semibold text-stone-800">{gap.gap_area}</TableCell>
                               <TableCell>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${gap.opportunity === 'High' || gap.opportunity === 'Very High' ? 'bg-rose-100 text-rose-700' : 'bg-stone-200 text-stone-700'}`}>{gap.opportunity}</span>
                               </TableCell>
                               <TableCell className="font-medium text-stone-500 leading-tight">{gap.practical_step}</TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                       
                       <div className="bg-indigo-100/50 p-4 rounded-xl border border-indigo-200">
                          <p className="text-sm font-bold text-indigo-800 mb-1">💡 Competitive Insight:</p>
                          <p className="text-indigo-900 font-medium leading-relaxed">{data.competitive_landscape?.insight}</p>
                       </div>
                    </div>
                  </div>

                  {/* 3. Topics & 6. Pain Points */}
                  <div className="grid lg:grid-cols-2 gap-8">
                    <div className="neo-flat rounded-[2rem] p-8">
                       <h3 className="flex items-center gap-3 text-2xl font-bold text-stone-800 mb-8"><LayoutDashboard className="text-stone-500"/> 3. Topic Cluster Map</h3>
                       <div className="neo-pressed p-6 rounded-2xl mb-8 border-l-4 border-stone-800">
                         <p className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-2">Pillar Topic</p>
                         <p className="text-3xl font-black text-stone-800">{data.topic_clusters?.pillar_topic}</p>
                       </div>
                       <div className="space-y-6 mb-8 pl-4 border-l border-stone-200">
                         {data.topic_clusters?.clusters?.map((cluster: any, idx: number) => (
                           <div key={idx} className="relative">
                             <div className="absolute -left-[21px] top-2 w-3 h-3 rounded-full bg-stone-300"></div>
                             <h4 className="font-bold text-stone-700 text-lg mb-3">{String.fromCharCode(65 + idx)}. {cluster.name}</h4>
                             <ul className="flex flex-wrap gap-2">
                               {cluster.keywords?.map((kw: string, i: number) => (
                                 <li key={i} className="bg-white/60 px-3 py-1.5 rounded-md text-sm font-semibold text-stone-600 shadow-sm border border-stone-100">{kw}</li>
                               ))}
                             </ul>
                           </div>
                         ))}
                       </div>
                       <div className="bg-stone-200/50 p-4 rounded-xl border border-stone-300">
                          <p className="text-sm font-bold text-stone-700 mb-1">💡 Structural Insight:</p>
                          <p className="text-stone-800 font-medium leading-relaxed">{data.topic_clusters?.insight}</p>
                       </div>
                    </div>

                    <div className="neo-flat rounded-[2rem] p-8 flex flex-col bg-rose-50/50">
                       <h3 className="flex items-center gap-3 text-2xl font-bold text-rose-900 mb-8"><AlertTriangle className="text-rose-500"/> 6. Audience Pain Points</h3>
                       <div className="flex-1 space-y-4 mb-8">
                         {data.audience_pain_points?.points?.map((pt: string, i: number) => (
                           <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-rose-100 flex items-start gap-4">
                             <div className="w-8 h-8 shrink-0 rounded-full bg-rose-100 text-rose-600 font-bold flex items-center justify-center">{i+1}</div>
                             <p className="text-rose-900 font-medium pt-1">{pt}</p>
                           </div>
                         ))}
                       </div>
                       <div className="bg-rose-100 p-6 rounded-2xl border border-rose-200 mt-auto">
                          <p className="text-sm font-bold text-rose-800 uppercase tracking-widest mb-2">Emotional Drivers</p>
                          <p className="text-rose-950 text-xl font-bold leading-relaxed">{data.audience_pain_points?.insight}</p>
                       </div>
                    </div>
                  </div>

                  {/* 7. Content Strategy & 8. Execution Plan */}
                  <div className="neo-flat rounded-[2rem] p-8 md:p-12">
                     <h3 className="flex items-center gap-3 text-3xl font-black text-stone-800 mb-12"><FileText className="text-emerald-500 w-8 h-8"/> SEO Execution & Content Playbook</h3>
                     <div className="grid lg:grid-cols-2 gap-12">
                       <div>
                         <h4 className="text-xl font-bold text-stone-800 mb-6 bg-emerald-100 inline-block px-4 py-1.5 rounded-full text-emerald-800">7. Content Architecture</h4>
                         
                         <div className="mb-6">
                           <p className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-2">Pillar Page Target</p>
                           <p className="text-2xl font-bold text-stone-800">{data.content_strategy?.pillar_page}</p>
                         </div>
                         
                         <div className="mb-6">
                           <p className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-3">Cluster Articles</p>
                           <ul className="space-y-2">
                             {data.content_strategy?.cluster_content?.map((title: string, i: number) => (
                               <li key={i} className="font-semibold text-stone-700 flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> {title}</li>
                             ))}
                           </ul>
                         </div>

                         <div>
                           <p className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-3">Conversion Content</p>
                           <ul className="space-y-2">
                             {data.content_strategy?.conversion_content?.map((title: string, i: number) => (
                               <li key={i} className="font-semibold text-rose-700 flex items-center gap-2 bg-rose-50 px-3 py-2 rounded-lg">{title}</li>
                             ))}
                           </ul>
                         </div>
                       </div>

                       <div className="neo-pressed p-8 rounded-[2rem]">
                         <h4 className="text-xl font-bold text-stone-800 mb-8 border-b border-stone-200 pb-4">8. Deployment Timeline</h4>
                         <div className="space-y-8 relative">
                            <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-stone-300"></div>
                            
                            <div className="relative pl-10 group">
                              <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-black z-10 group-hover:scale-110 transition-transform">1</div>
                              <h5 className="font-bold text-stone-800 mb-2">Week 1–2: Foundation</h5>
                              <ul className="space-y-2">
                                {data.seo_execution_plan?.week_1_2?.map((step: string, i: number) => (
                                  <li key={i} className="flex items-center justify-between gap-4 text-stone-600 font-medium bg-white/40 p-2 rounded-lg border border-transparent hover:border-stone-200 transition-all">
                                    <span>- {step}</span>
                                    <button 
                                      onClick={() => { setCreateTopic(step); setActiveView('create'); }}
                                      className="text-[10px] font-black uppercase bg-stone-800 text-white px-2 py-1 rounded hover:bg-amber-500 transition-colors"
                                    >Execute</button>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="relative pl-10 group">
                              <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-black z-10 group-hover:scale-110 transition-transform">2</div>
                              <h5 className="font-bold text-stone-800 mb-2">Week 3–4: Linking</h5>
                              <ul className="space-y-2">
                                {data.seo_execution_plan?.week_3_4?.map((step: string, i: number) => (
                                  <li key={i} className="flex items-center justify-between gap-4 text-stone-600 font-medium bg-white/40 p-2 rounded-lg border border-transparent hover:border-stone-200 transition-all">
                                    <span>- {step}</span>
                                    <button 
                                      onClick={() => { setCreateTopic(step); setActiveView('create'); }}
                                      className="text-[10px] font-black uppercase bg-stone-800 text-white px-2 py-1 rounded hover:bg-amber-500 transition-colors"
                                    >Execute</button>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="relative pl-10 group">
                              <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-stone-800 text-white flex items-center justify-center text-xs font-black z-10 group-hover:scale-110 transition-transform">3</div>
                              <h5 className="font-bold text-stone-800 mb-2">Month 2: Conversion & Authority</h5>
                              <ul className="space-y-2">
                                {data.seo_execution_plan?.month_2?.map((step: string, i: number) => (
                                  <li key={i} className="flex items-center justify-between gap-4 text-stone-600 font-medium bg-white/40 p-2 rounded-lg border border-transparent hover:border-stone-200 transition-all">
                                    <span>- {step}</span>
                                    <button 
                                      onClick={() => { setCreateTopic(step); setActiveView('create'); }}
                                      className="text-[10px] font-black uppercase bg-stone-800 text-white px-2 py-1 rounded hover:bg-amber-500 transition-colors"
                                    >Execute</button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                         </div>

                         {/* SIOS Module B - GEO Intelligence */}
                         {data.competitive_landscape?.geo_intelligence && (
                           <div className="bg-emerald-50 border-2 border-emerald-950 rounded-3xl p-8 mb-8 flex flex-col md:flex-row gap-10 items-center">
                              <div className="flex-shrink-0 relative">
                                 <div className="w-32 h-32 rounded-full border-8 border-stone-200 flex items-center justify-center">
                                    <span className="text-4xl font-black text-emerald-900">{data.competitive_landscape.geo_intelligence.geo_score}</span>
                                 </div>
                                 <div className="absolute -bottom-2 -right-2 bg-emerald-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg">GEO SCORE</div>
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                  <h4 className="text-xs font-black uppercase tracking-widest text-emerald-800">Generative Engine Optimization (GEO)</h4>
                                  <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${
                                    data.competitive_landscape.geo_intelligence.geo_pickup_likelihood === 'High' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                                  }`}>
                                    {data.competitive_landscape.geo_intelligence.geo_pickup_likelihood} Pickup Prob.
                                  </span>
                                </div>
                                <p className="text-emerald-950 font-medium text-lg leading-snug mb-6">{data.competitive_landscape.geo_intelligence.insight}</p>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  {data.competitive_landscape.geo_intelligence.optimization_tips?.map((tip: string, i: number) => (
                                    <div key={i} className="bg-white/60 p-3 rounded-xl border border-emerald-200 flex items-center gap-3 group hover:bg-white transition-all cursor-pointer" onClick={() => { setCreateTopic(tip); setActiveView('create'); }}>
                                       <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                       <span className="text-[11px] font-bold text-emerald-900 leading-tight">{tip}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                           </div>
                         )}
                       </div>
                     </div>
                  </div>

                   {/* 9 & 10. AI Angle & Final Insight */}
                  <div className="bg-stone-800 rounded-[2rem] p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="grid md:grid-cols-2 gap-12 relative z-10">
                       <div>
                         <h4 className="flex items-center gap-3 text-2xl font-bold text-amber-400 mb-6"><BrainCircuit/> 9. AI Winning Angles</h4>
                         <p className="text-stone-400 font-medium mb-4">Content tone & messaging recommendations to capture high-intent traffic:</p>
                         <div className="space-y-4">
                           {data.ai_content_angle?.winning_messaging?.map((msg: string, i: number) => (
                             <div key={i} className="bg-stone-700/50 p-4 rounded-xl border border-stone-600">
                               <p className="font-bold text-stone-100 text-lg">"{msg}"</p>
                             </div>
                           ))}
                         </div>
                       </div>
                       <div className="flex flex-col justify-center">
                         <h4 className="flex items-center gap-3 text-2xl font-bold text-white mb-6"><Lightbulb className="text-emerald-400"/> 10. Final Strategic Insight</h4>
                         <p className="text-stone-300 text-xl leading-relaxed font-medium">
                           {data.final_strategic_insight}
                         </p>
                       </div>
                    </div>
                  </div>

                  {/* Data Sources */}
                  {data.data_sources && data.data_sources.length > 0 && (
                    <div className="neo-flat rounded-[2rem] p-8">
                      <h3 className="flex items-center gap-3 text-xl font-bold text-stone-600 mb-2">
                        <Link2 className="text-stone-400 w-5 h-5"/> Data Sources
                        <span className="text-sm font-normal text-stone-400">— scraped live from DuckDuckGo</span>
                      </h3>
                      <p className="text-stone-400 text-sm font-medium mb-6">The analysis above is grounded on these currently-ranking pages. Volume & trend figures are AI-estimated.</p>
                      <div className="grid md:grid-cols-2 gap-3">
                        {data.data_sources.map((source: { title: string, url: string }, i: number) => (
                          <a key={i} href={source.url} target="_blank" rel="noopener noreferrer"
                             className="flex items-start gap-3 bg-white/60 p-4 rounded-xl border border-stone-100 hover:border-blue-300 hover:shadow-md transition-all group">
                            <span className="w-6 h-6 shrink-0 rounded-full bg-stone-100 text-stone-500 text-xs font-bold flex items-center justify-center mt-0.5 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">{i+1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-stone-800 text-sm leading-tight mb-1 group-hover:text-blue-700 transition-colors line-clamp-2">{source.title}</p>
                              <p className="font-mono text-xs text-stone-400 truncate">{source.url}</p>
                            </div>
                            <ArrowUpRight className="w-4 h-4 shrink-0 text-stone-300 group-hover:text-blue-500 mt-0.5 transition-colors"/>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              
              {/* Placeholder before query */}
              {!data && !isProcessing && (
                <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-1000">
                  <div className="neo-pressed w-32 h-32 rounded-full flex justify-center items-center mb-8 relative">
                    <ZapOff className="w-12 h-12 text-stone-400 opacity-50" />
                  </div>
                  <h3 className="text-2xl font-bold text-stone-800 mb-4">Awaiting Input</h3>
                  <p className="text-stone-500 font-medium max-w-md mx-auto text-center text-lg mb-12">
                    The engine is idle. Enter a keyword to generate fresh SEO intelligence.
                  </p>
                  
                  {recentQueries.length > 0 && (
                     <div className="w-full max-w-2xl neo-flat rounded-[2rem] p-8">
                       <p className="text-sm font-bold text-stone-500 uppercase tracking-widest mb-6 text-center">Recent Pipelines</p>
                       <div className="flex flex-wrap justify-center gap-4">
                         {recentQueries.map((q, idx) => (
                           <button 
                             key={idx} 
                             className="neo-btn rounded-full px-6 py-3 font-semibold text-stone-700"
                             onClick={() => {
                               setNiche(q.query);
                               setCurrentNiche(q.query);
                               fetchDashboard(q.query);
                             }}
                           >
                             {q.query}
                           </button>
                         ))}
                       </div>
                     </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Dashboards View */}
          {activeView === 'dashboards' && (
            <div className="animate-in fade-in duration-500 mt-4 lg:mt-12">
              <div className="flex items-center gap-4 mb-12 border-b border-white/20 pb-4">
                 <LayoutDashboard className="w-8 h-8 text-blue-500" />
                 <h2 className="text-4xl font-bold tracking-tight text-stone-800">Saved SEO Strategies</h2>
              </div>
              
              {dashboardsList.length === 0 ? (
                 <div className="text-center py-20 neo-flat rounded-[2rem]">
                   <p className="text-stone-500 font-medium text-lg">No strategic dashboards generated yet.</p>
                 </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {dashboardsList.map((db, i) => (
                    <div key={i} className="neo-flat rounded-[2rem] p-8 flex flex-col justify-between group hover:neo-pressed transition-all cursor-pointer"
                         onClick={() => {
                           setNiche(db.niche);
                           setCurrentNiche(db.niche);
                           fetchDashboard(db.niche);
                           setActiveView('explore');
                         }}>
                      <div>
                        <h3 className="text-xl font-bold text-stone-800 mb-4 group-hover:text-blue-600 transition-colors">{db.niche}</h3>
                        <p className="text-stone-500 text-sm font-medium mb-6">Last updated: {new Date(db.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-white/20">
                        <span className="neo-pressed px-3 py-1.5 rounded-full text-xs font-bold text-emerald-500 uppercase">Strategy Ready</span>
                        <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-stone-800 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Queries View */}
          {activeView === 'queries' && (
            <div className="animate-in fade-in duration-500 mt-4 lg:mt-12">
              <div className="flex items-center gap-4 mb-12 border-b border-white/20 pb-4">
                 <Activity className="w-8 h-8 text-emerald-500" />
                 <h2 className="text-4xl font-bold tracking-tight text-stone-800">Intelligence Log</h2>
              </div>

              <div className="neo-flat rounded-[2rem] p-4 lg:p-8 overflow-hidden">
                 <div className="overflow-x-auto">
                   <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-0">
                          <TableHead className="font-bold text-stone-500 pt-4 pb-2">Query ID</TableHead>
                          <TableHead className="font-bold text-stone-500 pt-4 pb-2">Keyword</TableHead>
                          <TableHead className="font-bold text-stone-500 pt-4 pb-2">Timestamp</TableHead>
                          <TableHead className="font-bold text-stone-500 pt-4 pb-2 text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {queriesList.map((q, i) => (
                           <TableRow key={i} className="hover:bg-black/5 border-b-0 transition-colors">
                             <TableCell className="font-mono text-xs text-stone-400 py-4">{q.id.split('-')[0]}</TableCell>
                             <TableCell className="font-semibold text-stone-700 py-4 max-w-[200px] truncate">{q.query}</TableCell>
                             <TableCell className="font-mono text-sm text-stone-500 py-4">{new Date(q.created_at).toLocaleString()}</TableCell>
                             <TableCell className="py-4 flex justify-end">
                                {q.status === 'completed' && <span className="neo-pressed px-3 py-1 text-xs font-bold rounded-full text-emerald-600 block w-max">Analyzed</span>}
                                {q.status === 'failed' && (
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="neo-pressed px-3 py-1 text-xs font-bold rounded-full text-rose-600 block w-max">Failed</span>
                                    {q.error_message && <span className="text-[10px] text-rose-400 max-w-[150px] truncate" title={q.error_message}>{q.error_message}</span>}
                                  </div>
                                )}
                                {(q.status === 'processing' || q.status === 'pending') && <span className="neo-pressed px-3 py-1 text-xs font-bold rounded-full text-amber-600 block w-max flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin"/> Mining</span>}
                             </TableCell>
                           </TableRow>
                        ))}
                        {queriesList.length === 0 && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={4} className="text-center py-12 text-stone-500 font-medium">No recorded pipeline queries.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                   </Table>
                 </div>
              </div>
            </div>
          )}

          {/* Create View */}
          {activeView === 'create' && (
            <div className="animate-in fade-in duration-500 mt-4 lg:mt-12 max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-12 border-b border-white/20 pb-4">
                 <div className="flex items-center gap-4">
                   <Zap className="w-8 h-8 text-amber-500" />
                   <h2 className="text-4xl font-bold tracking-tight text-stone-800">Content Engine</h2>
                 </div>
                 {data && (
                    <span className="bg-stone-800 text-white text-[10px] font-black uppercase px-2 py-1 rounded">Strategy Linked</span>
                 )}
              </div>

              <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                  <div className="neo-flat rounded-[2rem] p-8">
                  <form onSubmit={handleGenerateContent} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-stone-500 uppercase tracking-widest ml-2">Topic or Keyword</label>
                      <div className="neo-pressed rounded-2xl px-6 py-4">
                        <Input 
                          placeholder="e.g. Benefits of Keto for Weight Loss" 
                          className="border-none shadow-none bg-transparent focus-visible:ring-0 text-lg h-auto py-0 text-stone-800 placeholder:text-stone-400 font-bold"
                          value={createTopic}
                          onChange={(e) => setCreateTopic(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-500 uppercase tracking-widest ml-2">Platform</label>
                        <select 
                          className="w-full neo-pressed rounded-2xl px-6 py-4 bg-transparent outline-none font-bold text-stone-800 appearance-none"
                          value={createPlatform}
                          onChange={(e) => setCreatePlatform(e.target.value)}
                        >
                          <option>Website</option>
                          <option>Reddit</option>
                          <option>X</option>
                          <option>LinkedIn</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-500 uppercase tracking-widest ml-2">Format</label>
                        <div className="flex neo-pressed rounded-2xl p-1 h-[60px]">
                           <button 
                             type="button"
                             onClick={() => setCreateContentType('Post')}
                             className={`flex-1 rounded-xl font-bold transition-all ${createContentType === 'Post' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
                           >Post</button>
                           <button 
                             type="button"
                             onClick={() => setCreateContentType('Comment')}
                             className={`flex-1 rounded-xl font-bold transition-all ${createContentType === 'Comment' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400 hover:text-stone-600'}`}
                           >Comment</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-stone-500 uppercase tracking-widest ml-2">Tone</label>
                        <select 
                          className="w-full neo-pressed rounded-2xl px-6 py-4 bg-transparent outline-none font-bold text-stone-800 appearance-none"
                          value={createTone}
                          onChange={(e) => setCreateTone(e.target.value)}
                        >
                          <option>Professional</option>
                          <option>Casual</option>
                          <option>Viral</option>
                          <option>Educational</option>
                        </select>
                      </div>
                    </div>

                    {data && (
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-3">
                        <BrainCircuit className="w-5 h-5 text-emerald-500" />
                        <p className="text-sm font-medium text-emerald-800">
                          <strong>Active Intelligence:</strong> Generating content with live SEO insights from "{currentNiche}".
                        </p>
                      </div>
                    )}

                    <button 
                      type="submit" 
                      disabled={isGenerating || !createTopic}
                      className="w-full neo-btn rounded-2xl py-5 font-black text-xl text-stone-800 flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] group overflow-hidden relative"
                    >
                      {isGenerating ? (
                        <><RefreshCw className="w-6 h-6 animate-spin" /> Weaving Content...</>
                      ) : (
                        <><Zap className="w-6 h-6 text-amber-500 group-hover:scale-125 transition-transform" /> Generate Optimized Content</>
                      )}
                    </button>
                  </form>
                </div>

                {generatedContent && (
                  <div className="neo-flat rounded-[2rem] p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-8">
                       <h3 className="text-2xl font-bold text-stone-800">Review Output</h3>
                       <button 
                         onClick={() => {
                           navigator.clipboard.writeText(generatedContent);
                           alert("Copied to clipboard!");
                         }}
                         className="neo-btn px-6 py-2 rounded-xl text-sm font-bold text-stone-700 flex items-center gap-2 group"
                       >
                         <FileText className="w-4 h-4 text-stone-400 group-hover:text-stone-800" /> Copy Markdown
                       </button>
                    </div>
                    <div className="prose prose-stone max-w-none neo-pressed p-8 rounded-3xl bg-white/50 whitespace-pre-wrap font-medium leading-relaxed text-stone-800">
                      {generatedContent}
                    </div>
                  </div>
                )}
                </div>

                {/* Strategic Roadmap Sidebar */}
                {data && (
                  <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="neo-flat rounded-[2rem] p-6 border-t-8 border-stone-800 shadow-xl">
                      <h3 className="text-lg font-black text-stone-800 mb-6 flex items-center gap-2">
                        <Flag className="w-5 h-5 text-stone-400"/> Strategic Roadmap
                      </h3>
                      
                      <div className="space-y-8">
                        <div>
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Weeks 1–2</p>
                          <ul className="space-y-3">
                            {data.seo_execution_plan?.week_1_2?.map((step: string, i: number) => (
                              <li key={i}>
                                <button 
                                  onClick={() => setCreateTopic(step)}
                                  className="w-full text-left bg-stone-100 hover:bg-stone-200 p-3 rounded-xl text-sm font-semibold text-stone-700 transition-colors border border-transparent hover:border-stone-300 group flex items-start gap-2"
                                >
                                  <div className="w-4 h-4 mt-0.5 rounded bg-stone-300 group-hover:bg-amber-500 transition-colors"></div>
                                  {step}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Weeks 3–4</p>
                          <ul className="space-y-3">
                            {data.seo_execution_plan?.week_3_4?.map((step: string, i: number) => (
                              <li key={i}>
                                <button 
                                  onClick={() => setCreateTopic(step)}
                                  className="w-full text-left bg-stone-100 hover:bg-stone-200 p-3 rounded-xl text-sm font-semibold text-stone-700 transition-colors border border-transparent hover:border-stone-300 group flex items-start gap-2"
                                >
                                  <div className="w-4 h-4 mt-0.5 rounded bg-stone-300 group-hover:bg-amber-500 transition-colors"></div>
                                  {step}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3">Month 2</p>
                          <ul className="space-y-3">
                            {data.seo_execution_plan?.month_2?.map((step: string, i: number) => (
                              <li key={i}>
                                <button 
                                  onClick={() => setCreateTopic(step)}
                                  className="w-full text-left bg-stone-100 hover:bg-stone-200 p-3 rounded-xl text-sm font-semibold text-stone-700 transition-colors border border-transparent hover:border-stone-300 group flex items-start gap-2"
                                >
                                  <div className="w-4 h-4 mt-0.5 rounded bg-stone-300 group-hover:bg-amber-500 transition-colors"></div>
                                  {step}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                       <p className="text-[10px] font-black text-amber-800 uppercase mb-1">Expert Tip:</p>
                       <p className="text-xs font-medium text-amber-900 leading-tight">Executing tasks in order ensures you build the necessary semantic foundation before scaling conversion content.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
