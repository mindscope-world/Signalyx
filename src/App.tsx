import { useState, useEffect } from 'react';
import { Search, Activity, Target, Zap, LayoutDashboard, BrainCircuit, RefreshCw, BarChart2, Bell, User, Mouse, Facebook, Instagram, Twitter, ChevronDown, ChevronRight, ZapOff } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ScatterChart, ZAxis, Scatter
} from 'recharts';

import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Progress } from './components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table';
import { Skeleton } from './components/ui/skeleton';

export default function App() {
  const [activeView, setActiveView] = useState<'explore' | 'dashboards' | 'queries'>('explore');
  const [niche, setNiche] = useState('');
  const [currentNiche, setCurrentNiche] = useState('Type 2 Diabetes Alternatives');
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  
  // New States
  const [dashboardsList, setDashboardsList] = useState<any[]>([]);
  const [queriesList, setQueriesList] = useState<any[]>([]);

  useEffect(() => {
    // Initial fetch for demo purposes
    fetchDashboard(currentNiche);
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
        // If empty, the engine hasn't processed it yet
        if ((json.keywords && json.keywords.length > 0) || (json.insights && json.insights.length > 0)) {
          setData(json);
        } else {
           if (isProcessing) {
             // Let it continue processing
           } else {
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
    setData(null); // Clear old

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche })
      });
      const result = await res.json();
      
      if (result.queryId) {
        // Poll for status
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
      const data = await res.json();
      
      if (data.status === 'completed') {
        await fetchDashboard(targetNiche);
        fetchRecentQueries();
        setIsProcessing(false);
      } else if (data.status === 'failed') {
        // Fetch error log if possible or show detailed error
        alert("Pipeline failed to process niche: " + (data.error_message || "Unknown error. Check console."));
        setIsProcessing(false);
      } else {
        // Continue polling
        setTimeout(() => pollStatus(queryId, targetNiche), 2000);
      }
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
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
        
        <div className="flex flex-col items-center gap-2">
           <span className="text-xs font-bold text-stone-700">EN</span>
           <ChevronDown className="w-4 h-4 text-stone-500" />
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto w-full relative">
        
        {/* Right Sidebar Social/Actions */}
        <div className="fixed right-6 top-8 bottom-8 flex flex-col justify-between items-center z-20 pointer-events-none hidden lg:flex">
          <div className="flex flex-col gap-6 pointer-events-auto neo-flat p-3 rounded-full">
            <User className="w-5 h-5 text-stone-700 cursor-pointer hover:text-stone-900 transition-colors" />
            <Bell className="w-5 h-5 text-stone-700 cursor-pointer hover:text-stone-900 transition-colors" />
          </div>
          <div className="flex flex-col gap-6 pointer-events-auto">
            <Facebook className="w-4 h-4 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer" />
            <Instagram className="w-4 h-4 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer" />
            <Twitter className="w-4 h-4 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer" />
          </div>
        </div>

        {/* Scroll Indicator Bottom Center */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center text-stone-400 z-10 pointer-events-none hidden md:flex">
           <Mouse className="w-5 h-5 mb-1" />
           <span className="text-[10px] tracking-widest uppercase">Scroll Down</span>
        </div>

        {/* Header */}
        <header className="px-6 md:px-12 py-8 flex items-center justify-between w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setActiveView('explore')}>
            <div className="w-12 h-12 rounded-full neo-flat flex items-center justify-center p-2 group-hover:neo-pressed transition-all">
              <BrainCircuit className="w-6 h-6 text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-800">Signalyx</h1>
          </div>
          <div className="lg:hidden flex gap-4">
             <div className="w-10 h-10 rounded-full neo-flat flex items-center justify-center">
               <User className="w-5 h-5 text-stone-700" />
             </div>
             <div className="w-10 h-10 rounded-full neo-flat flex items-center justify-center">
               <Bell className="w-5 h-5 text-stone-700" />
             </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 pb-24 relative z-0">
          
          {activeView === 'explore' && (
            <>
              {/* Hero Section */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-12 mt-4 lg:mt-12 mb-16">
                <div className="flex-1 space-y-8 max-w-xl">
                  <h2 className="text-5xl lg:text-7xl font-bold tracking-tighter text-stone-800 leading-[1.1]">
                    Market <br/><span className="text-stone-600">Intelligence</span>
                  </h2>
              <p className="text-stone-500 text-lg leading-relaxed font-medium">
                Continuously scrape, interpret, and convert niche-specific demand signals into actionable marketing insights in minutes.
              </p>
              
              <form onSubmit={handleRunPipeline} className="mt-8 flex flex-col sm:flex-row items-center gap-6 w-full max-w-lg">
                <div className="w-full neo-pressed rounded-full px-6 py-4 flex items-center gap-3">
                  <Search className="w-5 h-5 text-stone-400 shrink-0" />
                  <Input 
                    placeholder="Enter a niche (e.g. Fintech AI)..." 
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
                  {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Run Engine"}
                  {!isProcessing && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            </div>

            {/* Illustration / Graphic Area (Neomorphic focus) */}
            <div className="flex-1 flex justify-center items-center w-full max-w-lg relative">
              <div className="w-64 h-64 md:w-80 md:h-80 rounded-full neo-flat flex items-center justify-center relative">
                 <div className="w-48 h-48 md:w-60 md:h-60 rounded-full neo-pressed flex items-center justify-center">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-amber-400 neo-flat flex items-center justify-center relative group cursor-pointer hover:bg-amber-300 transition-colors">
                      <Target className="w-16 h-16 text-white" />
                    </div>
                 </div>
                 {/* Decorative floating elements */}
                 <div className="absolute top-0 right-0 w-16 h-16 rounded-full neo-flat flex items-center justify-center">
                   <Activity className="w-6 h-6 text-emerald-500" />
                 </div>
                 <div className="absolute bottom-4 left-0 w-20 h-20 rounded-full neo-flat flex items-center justify-center">
                   <Zap className="w-8 h-8 text-blue-500" />
                 </div>
              </div>
            </div>
          </div>

          {/* Loading State Simulator */}
          {isProcessing && (
            <div className="neo-flat rounded-[2rem] p-12 text-center max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 mb-16 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]"></div>
               <div className="inline-flex neo-pressed p-6 rounded-full text-amber-500 mb-8">
                 <RefreshCw className="w-10 h-10 animate-spin" />
               </div>
               <h3 className="text-2xl font-bold text-stone-800 mb-3">Orchestrating Pipeline...</h3>
               <p className="text-stone-500 mb-8 max-w-md mx-auto text-lg">Running distributed data collection, cleaning noise, and computing semantic embeddings.</p>
               
               <div className="neo-pressed h-4 rounded-full w-full overflow-hidden mb-4 p-0.5">
                 <div className="h-full bg-amber-400 rounded-full w-[45%] neo-flat animate-pulse"></div>
               </div>
               <div className="flex justify-between text-sm text-stone-500 font-medium px-2">
                 <span>Scraping Sources</span>
                 <span>Extracting Sentiments</span>
                 <span>LLM Synthesis</span>
               </div>
            </div>
          )}

          {/* Dashboard Display */}
          {data && !isProcessing && (
            <div className="space-y-12 animate-in fade-in duration-700 mt-12">
              
              {/* Header / Badges */}
              <div className="flex items-center gap-6 flex-wrap pb-4 border-b border-white/20">
                <h2 className="text-3xl font-bold tracking-tight text-stone-800">Report: {currentNiche}</h2>
                <div className="neo-flat px-4 py-2 rounded-full text-sm font-semibold text-emerald-600 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  Fresh Data
                </div>
                <div className="neo-pressed px-4 py-2 rounded-full text-sm font-medium text-stone-600 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4" />
                  {data.keywords?.length || 0} Viable Keywords
                </div>
              </div>

              {/* Top Cards */}
              <div className="grid md:grid-cols-3 gap-8">
                 <div className="neo-flat rounded-[2rem] p-8">
                   <div className="flex items-center gap-4 mb-6 text-stone-500 font-medium">
                     <div className="neo-pressed p-3 rounded-full">
                       <Target className="w-5 h-5 text-blue-500" />
                     </div>
                     Total Market Demand
                   </div>
                   <div className="text-4xl font-bold text-stone-800 mb-2">
                     {data.keywords?.reduce((acc: number, val: any) => acc + (val.search_volume || 0), 0).toLocaleString()}
                   </div>
                   <p className="text-sm text-emerald-600 font-semibold neo-pressed inline-block px-3 py-1 rounded-full">+12% vs last month</p>
                 </div>

                 <div className="neo-flat rounded-[2rem] p-8">
                   <div className="flex items-center gap-4 mb-6 text-stone-500 font-medium">
                     <div className="neo-pressed p-3 rounded-full">
                       <Activity className="w-5 h-5 text-emerald-500" />
                     </div>
                     Avg. Opportunity
                   </div>
                   <div className="text-4xl font-bold text-stone-800 mb-2">
                     {(data.keywords?.reduce((acc: number, val: any) => acc + (val.opportunity_score || 0), 0) / (data.keywords?.length || 1)).toFixed(2)}
                   </div>
                   <p className="text-sm text-stone-500 font-medium neo-pressed inline-block px-3 py-1 rounded-full">Demand / Competition</p>
                 </div>

                 <div className="neo-flat rounded-[2rem] p-8">
                   <div className="flex items-center gap-4 mb-6 text-stone-500 font-medium">
                     <div className="neo-pressed p-3 rounded-full">
                       <Zap className="w-5 h-5 text-amber-500" />
                     </div>
                     Detected Intents
                   </div>
                   <div className="text-4xl font-bold text-stone-800 mb-4">Active</div>
                   <div className="flex gap-3">
                     <span className="neo-pressed px-4 py-1.5 rounded-full text-sm font-medium text-stone-600">Informational</span>
                     <span className="neo-pressed px-4 py-1.5 rounded-full text-sm font-medium text-stone-600">Commercial</span>
                   </div>
                 </div>
              </div>

              {/* LLM INSIGHTS */}
              <div className="neo-flat rounded-[2rem] p-8 md:p-12">
                <div className="flex items-center gap-4 mb-8">
                  <div className="neo-pressed p-4 rounded-full">
                    <BrainCircuit className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-stone-800">Marketing & Content Angles</h3>
                    <p className="text-stone-500 font-medium">Synthesized from raw NLP layer</p>
                  </div>
                </div>
                
                <div className="grid lg:grid-cols-3 gap-8">
                  {data.insights?.map((insight: any, i: number) => (
                    <div key={i} className="neo-pressed rounded-2xl p-6 flex flex-col items-start hover:neo-flat transition-all cursor-default">
                      <div className="neo-flat px-4 py-2 rounded-full text-xs font-bold text-stone-700 uppercase tracking-wider mb-6">
                        {insight.type.replace('_', ' ')}
                      </div>
                      <p className="text-stone-600 leading-relaxed font-medium">
                        {insight.content 
                           ? (typeof JSON.parse(insight.content) === 'object' 
                                ? JSON.stringify(JSON.parse(insight.content)) 
                                : String(JSON.parse(insight.content))) 
                           : "No insight generated."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Main Content Split: Chart & Table */}
              <div className="grid xl:grid-cols-5 gap-8">
                 {/* Demand vs Competition Scatter Plot */}
                 <div className="xl:col-span-2 neo-flat rounded-[2rem] p-8">
                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-stone-800 mb-2">Opportunity Matrix</h3>
                      <p className="text-stone-500 text-sm font-medium">Top-left indicates high priority signals.</p>
                     </div>
                    <div className="h-[350px] neo-pressed rounded-2xl p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="#78716c" />
                          <XAxis type="number" dataKey="competition_score" name="Competition" 
                                 axisLine={{stroke: 'transparent'}} tickLine={false} 
                                 tick={{fill: '#a8a29e', fontSize: 12, fontWeight: 500}} 
                                 domain={[0, 100]} />
                          <YAxis type="number" dataKey="demand_score" name="Demand" 
                                 axisLine={{stroke: 'transparent'}} tickLine={false} 
                                 tick={{fill: '#a8a29e', fontSize: 12, fontWeight: 500}}
                                 domain={[0, 100]} />
                          <ZAxis type="number" dataKey="search_volume" range={[200, 800]} name="Search Vol" />
                          <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="neo-flat p-4 rounded-xl z-50">
                                    <p className="font-bold text-stone-800 mb-2">{data.keyword}</p>
                                    <div className="space-y-1 text-sm font-medium text-stone-500">
                                      <p>Demand: <span className="text-emerald-600">{data.demand_score}</span></p>
                                      <p>Comp: <span className="text-amber-600">{data.competition_score}</span></p>
                                      <p>Vol: <span className="text-blue-600">{data.search_volume}</span></p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter name="Keywords" data={data.keywords} fill="#f59e0b" fillOpacity={0.8} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Signal Mapping Table */}
                 <div className="xl:col-span-3 neo-flat rounded-[2rem] p-8 overflow-hidden flex flex-col">
                    <div className="mb-6 flex justify-between items-center pr-4">
                      <h3 className="text-xl font-bold text-stone-800">Signal Mapping</h3>
                      <button className="neo-btn p-3 rounded-full text-stone-600"><Search className="w-4 h-4"/></button>
                    </div>
                    <div className="neo-pressed rounded-2xl overflow-hidden flex-1 p-2">
                       <div className="overflow-x-auto h-full max-h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent border-b-0">
                              <TableHead className="font-bold text-stone-500 pt-4 pb-2">Keyword</TableHead>
                              <TableHead className="font-bold text-stone-500 pt-4 pb-2">Volume</TableHead>
                              <TableHead className="font-bold text-stone-500 pt-4 pb-2">Demand</TableHead>
                              <TableHead className="font-bold text-stone-500 pt-4 pb-2">Comp</TableHead>
                              <TableHead className="font-bold text-stone-500 text-right pt-4 pb-2 pr-4">Opp</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.keywords?.sort((a: any, b: any) => b.opportunity_score - a.opportunity_score).map((kw: any, i: number) => (
                              <TableRow key={i} className="hover:bg-black/5 border-b-0 transition-colors">
                                <TableCell className="font-semibold text-stone-700 py-4">{kw.keyword}</TableCell>
                                <TableCell className="font-mono font-medium text-stone-500 py-4">{kw.search_volume?.toLocaleString()}</TableCell>
                                <TableCell className="py-4">
                                  <div className="neo-flat h-3 w-20 rounded-full overflow-hidden p-0.5">
                                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${kw.demand_score}%` }}></div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4">
                                   <div className="neo-flat h-3 w-20 rounded-full overflow-hidden p-0.5">
                                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${kw.competition_score}%` }}></div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-mono text-emerald-600 font-bold text-lg py-4 pr-4">
                                  {kw.opportunity_score ? kw.opportunity_score.toFixed(2) : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                 </div>
              </div>

               {/* TOPIC CLUSTERS */}
               <div className="mt-12">
                  <h3 className="text-2xl font-bold text-stone-800 mb-8 pl-4 border-l-4 border-amber-400">Semantic Clusters</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {data.topics?.map((topic: any, i: number) => (
                      <div key={i} className="neo-flat rounded-[2rem] p-8 flex flex-col justify-between group hover:neo-pressed transition-all">
                        <div>
                          <div className="flex justify-between items-start mb-6">
                            <h4 className="text-xl font-bold text-stone-800 group-hover:text-amber-500 transition-colors">{topic.name}</h4>
                            <div className="w-10 h-10 rounded-full neo-pressed flex justify-center items-center font-mono font-bold text-stone-400 text-sm">
                              #{i + 1}
                            </div>
                          </div>
                          <p className="text-stone-600 font-medium leading-relaxed mb-6">{topic.description}</p>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-white/20">
                           <span className="neo-pressed px-4 py-2 rounded-full text-xs font-bold text-emerald-500 uppercase tracking-widest">
                             High Momentum
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
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
                The engine is idle. Run a pipeline to generate fresh market intelligence.
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
               <h2 className="text-4xl font-bold tracking-tight text-stone-800">Saved Dashboards</h2>
            </div>
            
            {dashboardsList.length === 0 ? (
               <div className="text-center py-20 neo-flat rounded-[2rem]">
                 <p className="text-stone-500 font-medium text-lg">No dashboards generated yet.</p>
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
                      <span className="neo-pressed px-3 py-1.5 rounded-full text-xs font-bold text-emerald-500 uppercase">Active</span>
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
               <h2 className="text-4xl font-bold tracking-tight text-stone-800">Query Log</h2>
            </div>

            <div className="neo-flat rounded-[2rem] p-4 lg:p-8 overflow-hidden">
               <div className="overflow-x-auto">
                 <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b-0">
                        <TableHead className="font-bold text-stone-500 pt-4 pb-2">Query ID</TableHead>
                        <TableHead className="font-bold text-stone-500 pt-4 pb-2">Niche</TableHead>
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
                              {q.status === 'completed' && <span className="neo-pressed px-3 py-1 text-xs font-bold rounded-full text-emerald-600 block w-max">Completed</span>}
                              {q.status === 'failed' && (
                                <div className="flex flex-col items-end gap-1">
                                  <span className="neo-pressed px-3 py-1 text-xs font-bold rounded-full text-rose-600 block w-max">Failed</span>
                                  {q.error_message && <span className="text-[10px] text-rose-400 max-w-[150px] truncate" title={q.error_message}>{q.error_message}</span>}
                                </div>
                              )}
                              {(q.status === 'processing' || q.status === 'pending') && <span className="neo-pressed px-3 py-1 text-xs font-bold rounded-full text-amber-600 block w-max flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin"/> Processing</span>}
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

        </main>
      </div>
    </div>
  );
}

