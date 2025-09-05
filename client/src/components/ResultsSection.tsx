import React, { useState } from "react";
import { Check, Download, Copy, RefreshCw, BrainCircuit, Sparkles, Lightbulb, Layers, FileText, Mail, FileType, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CognitiveAnalysisResult, ModelProvider } from "@/types/analysis";
import { MultiProviderAnalysisResult } from "@/hooks/useCognitiveAnalysis";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useComprehensiveReport } from "@/hooks/useComprehensiveReport";
import ComprehensiveReportModal from "@/components/ComprehensiveReportModal";
import { useIsMobile } from "@/hooks/use-mobile";

// Provider information for display
const providerInfo: Record<string, {
  name: string;
  color: string;
  icon: React.ComponentType<any>;
}> = {
  deepseek: { name: "DeepSeek", color: "bg-gray-800", icon: Layers },
  openai: { name: "OpenAI", color: "bg-emerald-600", icon: Sparkles },
  anthropic: { name: "Anthropic", color: "bg-blue-600", icon: BrainCircuit },
  perplexity: { name: "Perplexity", color: "bg-purple-600", icon: Lightbulb }
};

// Single profile card component
function CognitiveProfileCard({ 
  result, 
  providerKey,
  onGenerateReport
}: { 
  result: CognitiveAnalysisResult; 
  providerKey: ModelProvider;
  onGenerateReport?: (provider: ModelProvider) => void;
}) {
  // Check if the providerKey exists in providerInfo before destructuring
  if (!providerInfo[providerKey]) {
    return null; // Skip rendering if provider info isn't available
  }
  
  const { name, color, icon: Icon } = providerInfo[providerKey];
  
  return (
    <div className="bg-white rounded-xl shadow-md border border-neutral-200 overflow-hidden">
      <div className={cn("p-4 text-white flex items-center justify-between gap-2", color)}>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <h3 className="font-heading font-semibold">{name} Analysis</h3>
        </div>
        
        {/* Add Full Report button if handler is provided */}
        {onGenerateReport && (
          <Button
            variant="secondary" 
            size="sm" 
            className="bg-white/10 hover:bg-white/20 text-white"
            onClick={() => onGenerateReport(providerKey)}
          >
            <BookOpen className="h-4 w-4 mr-1" />
            Full Report
          </Button>
        )}
      </div>
      
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Intelligence Score</span>
            <span className="text-primary font-semibold">{result.intelligenceScore}/100</span>
          </div>
          <Progress value={result.intelligenceScore} className="h-2" />
        </div>
        
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Cognitive Characteristics</h4>
          <div className="flex flex-wrap gap-2">
            {result.characteristics.map((characteristic, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 rounded-full text-blue-800 text-sm font-medium"
              >
                {characteristic}
              </span>
            ))}
          </div>
        </div>
        
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Analysis</h4>
          <p className="text-gray-800">{result.detailedAnalysis}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Cognitive Strengths</h4>
            <ul className="list-disc pl-4 space-y-1">
              {result.strengths.map((strength, index) => (
                <li key={index} className="text-gray-800">{strength}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Cognitive Tendencies</h4>
            <ul className="list-disc pl-4 space-y-1">
              {result.tendencies.map((tendency, index) => (
                <li key={index} className="text-gray-800">{tendency}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ResultsSectionProps {
  result: MultiProviderAnalysisResult;
  onNewAnalysis: (clearText?: boolean) => void;
}

export default function ResultsSection({ result, onNewAnalysis }: ResultsSectionProps) {
  const [activeTab, setActiveTab] = useState("all-profiles");
  const [copied, setCopied] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider>("openai");
  const [documentFormat, setDocumentFormat] = useState<"pdf" | "docx">("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Use the comprehensive report hook
  const { 
    generateReport, 
    isGenerating, 
    currentReport, 
    isModalOpen, 
    closeModal 
  } = useComprehensiveReport();

  // Calculate average intelligence score across all providers
  // Filter entries that are actual providers (not originalText or other properties)
  const validProviders = Object.entries(result)
    .filter(([key]) => 
      key !== 'originalText' && 
      providerInfo[key as ModelProvider] && 
      typeof result[key as ModelProvider] !== 'string'
    );
  
  const averageScore = validProviders.length > 0 ? Math.round(
    validProviders.reduce((sum, [_, profile]) => sum + (profile as CognitiveAnalysisResult).intelligenceScore, 0) / validProviders.length
  ) : 0;

  const copyResults = () => {
    // Create a combined text representation of all results
    let resultsText = `COGNITIVE PROFILE ANALYSIS\n\n`;
    
    // Add summary of all models
    resultsText += `SUMMARY OF ALL ANALYSES:\n`;
    resultsText += `Average Intelligence Score: ${averageScore}/100\n\n`;
    
    // Add individual model results
    validProviders.forEach(([provider, analysis]) => {
      const typedAnalysis = analysis as CognitiveAnalysisResult;
      const providerName = providerInfo[provider as ModelProvider]?.name || provider;
      
      resultsText += `${providerName} ANALYSIS:\n`;
      resultsText += `Intelligence Score: ${typedAnalysis.intelligenceScore}/100\n`;
      resultsText += `Characteristics: ${typedAnalysis.characteristics.join(', ')}\n`;
      resultsText += `Detailed Analysis: ${typedAnalysis.detailedAnalysis}\n`;
      resultsText += `Strengths: ${typedAnalysis.strengths.join(', ')}\n`;
      resultsText += `Tendencies: ${typedAnalysis.tendencies.join(', ')}\n\n`;
    });
    
    navigator.clipboard.writeText(resultsText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadResults = () => {
    // Create a combined text representation of all results
    let resultsText = `COGNITIVE PROFILE ANALYSIS\n\n`;
    
    // Add summary of all models
    resultsText += `SUMMARY OF ALL ANALYSES:\n`;
    resultsText += `Average Intelligence Score: ${averageScore}/100\n\n`;
    
    // Add individual model results
    validProviders.forEach(([provider, analysis]) => {
      const typedAnalysis = analysis as CognitiveAnalysisResult;
      const providerName = providerInfo[provider as ModelProvider]?.name || provider;
      
      resultsText += `${providerName} ANALYSIS:\n`;
      resultsText += `Intelligence Score: ${typedAnalysis.intelligenceScore}/100\n`;
      resultsText += `Characteristics: ${typedAnalysis.characteristics.join(', ')}\n`;
      resultsText += `Detailed Analysis: ${typedAnalysis.detailedAnalysis}\n`;
      resultsText += `Strengths: ${typedAnalysis.strengths.join(', ')}\n`;
      resultsText += `Tendencies: ${typedAnalysis.tendencies.join(', ')}\n\n`;
    });
    
    // Create a blob and download link
    const blob = new Blob([resultsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cognitive-analysis.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Handle exporting document
  const exportDocument = async () => {
    try {
      setIsExporting(true);
      
      // Create document based on selected provider
      // Use our own analysis results as content
      const selectedResult = result[selectedProvider];
      if (!selectedResult) {
        throw new Error(`No analysis results found for ${selectedProvider}`);
      }
      
      // Create request body
      const requestData = {
        provider: selectedProvider,
        format: documentFormat,
        analysis: selectedResult,
      };
      
      // Send request to server
      const response = await apiRequest("POST", "/api/export-document", requestData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to export document");
      }
      
      // Get document as blob
      const blob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cognitive-analysis.${documentFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Document exported",
        description: `Cognitive profile exported as ${documentFormat.toUpperCase()} successfully.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export document. Please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Handle sharing via email
  const shareViaEmail = async () => {
    try {
      setIsSharing(true);
      
      if (!recipientEmail) {
        throw new Error("Please provide a recipient email address");
      }
      
      // Use our own analysis results as content for the selected provider
      const selectedResult = result[selectedProvider];
      if (!selectedResult) {
        throw new Error(`No analysis results found for ${selectedProvider}`);
      }
      
      // Create request body
      const requestData = {
        provider: selectedProvider,
        format: documentFormat,
        analysis: selectedResult,
        recipientEmail,
        senderName: senderName || undefined,
      };
      
      // Send request to server
      const response = await apiRequest("POST", "/api/share-via-email", requestData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send email");
      }
      
      toast({
        title: "Email sent",
        description: `Cognitive profile shared with ${recipientEmail} successfully.`,
      });
    } catch (error) {
      console.error('Error sharing via email:', error);
      toast({
        variant: "destructive",
        title: "Sharing failed",
        description: error instanceof Error ? error.message : "Failed to share via email. Please try again.",
      });
    } finally {
      setIsSharing(false);
    }
  };

  // Handle generating full report - can be called with a specific provider or use active/selected
  const handleFullReport = (specificProvider?: ModelProvider) => {
    // Use the provided specific provider, current active tab, or selected provider
    const provider = specificProvider || (activeTab === "all-profiles" ? selectedProvider : activeTab as ModelProvider);
    
    // Make sure provider exists in the results
    if (!result[provider] || typeof result[provider] === 'string') {
      toast({
        variant: "destructive",
        title: "Report generation failed",
        description: `No analysis results found for ${provider}`,
      });
      return;
    }

    // Get the analysis result for this provider
    const analysis = result[provider] as CognitiveAnalysisResult;
    
    // Build a text from the analysis results if original text is missing or too short
    let textToAnalyze = result.originalText || "";
    
    if (!textToAnalyze || textToAnalyze.length < 100) {
      // Create a substantial text from the analysis data
      textToAnalyze = "Analysis based on cognitive profile assessment. ";
      textToAnalyze += `Intelligence Score: ${analysis.intelligenceScore}/100. `;
      textToAnalyze += `Cognitive Characteristics: ${analysis.characteristics.join(", ")}. `;
      textToAnalyze += `Detailed Analysis: ${analysis.detailedAnalysis} `;
      textToAnalyze += `Cognitive Strengths: ${analysis.strengths.join(". ")}. `;
      textToAnalyze += `Cognitive Tendencies: ${analysis.tendencies.join(". ")}. `;
      
      // Add more unique content to ensure sufficient length and quality
      textToAnalyze += `This cognitive profile demonstrates ${analysis.intelligenceScore > 70 ? "above average" : "average"} intelligence with particular strengths in ${analysis.strengths[0] || "analytical thinking"}. `;
      textToAnalyze += `The reasoning style can be characterized as ${analysis.characteristics[0] || "methodical"} with a tendency toward ${analysis.tendencies[0] || "systematic analysis"}. `;
      textToAnalyze += `This cognitive profile would benefit from further development in areas that complement the existing strengths, particularly focusing on enhancing versatility in problem-solving approaches.`;
    }
    
    toast({
      title: "Generating comprehensive report",
      description: "This may take a moment...",
    });
    
    // Generate the comprehensive report using the best available text
    generateReport(textToAnalyze, provider);
  };

  return (
    <section className="mb-8 max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-card border border-neutral-200 overflow-hidden">
        <div className="bg-secondary p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="font-heading font-semibold text-xl text-white">Multi-Provider Cognitive Profile</h2>
            
            <div className="flex gap-2">
              {/* Re-analyze button - keeps the text */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNewAnalysis(false)}
                className="bg-white/20 text-white hover:bg-white/30 border-white/40 font-medium"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Re-analyze
              </Button>
              
              {/* New Analysis button - clears everything */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNewAnalysis(true)}
                className="bg-white text-secondary hover:bg-white/90 border-white/20 font-medium"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                New Analysis
              </Button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-white/10 hover:bg-white/20 text-white"
                onClick={copyResults}
              >
                {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-white/10 hover:bg-white/20 text-white"
                onClick={downloadResults}
              >
                <Download className="h-4 w-4 mr-1" />
                Text
              </Button>
              
              {/* Full Report button */}
              <Button
                variant="secondary" 
                size="sm" 
                className="bg-white/10 hover:bg-white/20 text-white"
                onClick={() => handleFullReport()}
                disabled={isGenerating}
              >
                <BookOpen className="h-4 w-4 mr-1" />
                {isGenerating ? "Generating..." : "Full Report"}
              </Button>
              
              {/* Export document dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Export Analysis</DialogTitle>
                    <DialogDescription>
                      Export your cognitive analysis as a document.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="provider" className="text-right">
                        Provider
                      </Label>
                      <Select
                        value={selectedProvider}
                        onValueChange={(value) => setSelectedProvider(value as ModelProvider)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="perplexity">Perplexity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="format" className="text-right">
                        Format
                      </Label>
                      <Select
                        value={documentFormat}
                        onValueChange={(value) => setDocumentFormat(value as "pdf" | "docx")}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select Format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF Document</SelectItem>
                          <SelectItem value="docx">Word Document</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      onClick={exportDocument}
                      disabled={isExporting}
                    >
                      {isExporting ? "Exporting..." : `Export as ${documentFormat.toUpperCase()}`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {/* Email sharing dialog */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white"
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Share Analysis</DialogTitle>
                    <DialogDescription>
                      Share your cognitive analysis via email.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="provider" className="text-right">
                        Provider
                      </Label>
                      <Select
                        value={selectedProvider}
                        onValueChange={(value) => setSelectedProvider(value as ModelProvider)}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="perplexity">Perplexity</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="recipient@example.com"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Your Name
                      </Label>
                      <Input
                        id="name"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Optional"
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="format" className="text-right">
                        Format
                      </Label>
                      <Select
                        value={documentFormat}
                        onValueChange={(value) => setDocumentFormat(value as "pdf" | "docx")}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select Format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="docx">Word</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      onClick={shareViaEmail}
                      disabled={isSharing || !recipientEmail}
                    >
                      {isSharing ? "Sending..." : "Send Email"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Display summary stats */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/90">Average Intelligence Score</span>
              <span className="text-white font-medium">{averageScore}/100</span>
            </div>
            <Progress 
              value={averageScore} 
              className="h-2.5 bg-white/20" 
            />
          </div>
        </div>
        
        <Card className="mt-6">
          <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="font-heading text-lg mb-4">Provider Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {validProviders.map(([provider, analysis]) => {
                const typedAnalysis = analysis as CognitiveAnalysisResult;
                return (
                  <div key={provider} className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
                    <div className="flex items-center gap-2 mb-2">
                      {React.createElement(providerInfo[provider as ModelProvider].icon, { className: "h-4 w-4 text-primary" })}
                      <span className="font-medium">{providerInfo[provider as ModelProvider].name}</span>
                    </div>
                    <div className="text-center py-2">
                      <span className="text-3xl font-bold text-primary">{typedAnalysis.intelligenceScore}</span>
                    </div>
                    <div className="text-center text-sm text-neutral-500">Intelligence Score</div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div>
            <h3 className="font-heading text-lg mb-4">Individual Provider Analyses</h3>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-1 sm:grid-cols-4">
                <TabsTrigger value="all-profiles">All Profiles</TabsTrigger>
                <TabsTrigger value="openai">OpenAI</TabsTrigger>
                <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
                <TabsTrigger value="perplexity">Perplexity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all-profiles" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {validProviders.map(([provider, analysis]) => (
                    <div key={provider} className="bg-white rounded-xl shadow-md border border-neutral-200 overflow-hidden">
                      <div className={cn("p-4 text-white flex items-center justify-between gap-2", providerInfo[provider as ModelProvider]?.color)}>
                        <div className="flex items-center gap-2">
                          {providerInfo[provider as ModelProvider]?.icon && React.createElement(providerInfo[provider as ModelProvider].icon, { className: "h-5 w-5" })}
                          <h3 className="font-heading font-semibold">{providerInfo[provider as ModelProvider]?.name} Analysis</h3>
                        </div>
                        
                        {/* FULL REPORT BUTTON */}
                        <Button
                          variant="secondary" 
                          size="sm" 
                          className="bg-white/10 hover:bg-white/20 text-white"
                          onClick={() => handleFullReport(provider as ModelProvider)}
                        >
                          <BookOpen className="h-4 w-4 mr-1" />
                          Full Report
                        </Button>
                      </div>
                      
                      <div className="p-6">
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Intelligence Score</span>
                            <span className="text-primary font-semibold">{(analysis as CognitiveAnalysisResult).intelligenceScore}/100</span>
                          </div>
                          <Progress value={(analysis as CognitiveAnalysisResult).intelligenceScore} className="h-2" />
                        </div>
                        
                        <div className="mb-6">
                          <h4 className="font-medium text-secondary-light mb-2">Cognitive Characteristics</h4>
                          <div className="flex flex-wrap gap-2">
                            {(analysis as CognitiveAnalysisResult).characteristics.map((characteristic, index) => (
                              <span
                                key={index}
                                className="px-3 py-1 bg-secondary/10 rounded-full text-secondary-dark text-sm"
                              >
                                {characteristic}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="mb-6">
                          <h4 className="font-medium text-secondary-light mb-2">Analysis</h4>
                          <p className="text-neutral-700">{(analysis as CognitiveAnalysisResult).detailedAnalysis}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium text-secondary-light mb-2">Cognitive Strengths</h4>
                            <ul className="list-disc pl-4 space-y-1">
                              {(analysis as CognitiveAnalysisResult).strengths.map((strength, index) => (
                                <li key={index} className="text-neutral-700">{strength}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-secondary-light mb-2">Cognitive Tendencies</h4>
                            <ul className="list-disc pl-4 space-y-1">
                              {(analysis as CognitiveAnalysisResult).tendencies.map((tendency, index) => (
                                <li key={index} className="text-neutral-700">{tendency}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              {validProviders.map(([provider]) => (
                <TabsContent key={provider} value={provider} className="mt-4">
                  <div className="bg-white rounded-xl shadow-md border border-neutral-200 overflow-hidden">
                    <div className={cn("p-4 text-white flex items-center justify-between gap-2", providerInfo[provider as ModelProvider]?.color)}>
                      <div className="flex items-center gap-2">
                        {providerInfo[provider as ModelProvider]?.icon && React.createElement(providerInfo[provider as ModelProvider].icon, { className: "h-5 w-5" })}
                        <h3 className="font-heading font-semibold">{providerInfo[provider as ModelProvider]?.name} Analysis</h3>
                      </div>
                      
                      {/* FULL REPORT BUTTON */}
                      <Button
                        variant="secondary" 
                        size="sm" 
                        className="bg-white/10 hover:bg-white/20 text-white"
                        onClick={() => handleFullReport(provider as ModelProvider)}
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        Full Report
                      </Button>
                    </div>
                    
                    <div className="p-6">
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Intelligence Score</span>
                          <span className="text-primary font-semibold">{(result[provider as ModelProvider] as CognitiveAnalysisResult).intelligenceScore}/100</span>
                        </div>
                        <Progress value={(result[provider as ModelProvider] as CognitiveAnalysisResult).intelligenceScore} className="h-2" />
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="font-medium text-secondary-light mb-2">Cognitive Characteristics</h4>
                        <div className="flex flex-wrap gap-2">
                          {(result[provider as ModelProvider] as CognitiveAnalysisResult).characteristics.map((characteristic, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-secondary/10 rounded-full text-secondary-dark text-sm"
                            >
                              {characteristic}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <h4 className="font-medium text-secondary-light mb-2">Analysis</h4>
                        <p className="text-neutral-700">{(result[provider as ModelProvider] as CognitiveAnalysisResult).detailedAnalysis}</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-secondary-light mb-2">Cognitive Strengths</h4>
                          <ul className="list-disc pl-4 space-y-1">
                            {(result[provider as ModelProvider] as CognitiveAnalysisResult).strengths.map((strength, index) => (
                              <li key={index} className="text-neutral-700">{strength}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-secondary-light mb-2">Cognitive Tendencies</h4>
                          <ul className="list-disc pl-4 space-y-1">
                            {(result[provider as ModelProvider] as CognitiveAnalysisResult).tendencies.map((tendency, index) => (
                              <li key={index} className="text-neutral-700">{tendency}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </CardContent>
      </Card>
      
      {/* Original Analyzed Text */}
      {result.originalText && (
        <div className="mt-6 mb-4 bg-white rounded-xl shadow-card border border-neutral-200 overflow-hidden">
          <Accordion type="single" collapsible>
            <AccordionItem value="analyzed-text" className="border-none">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-secondary" />
                  <span className="font-heading font-medium">View Original Analyzed Text</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="px-6 pb-4">
                  <div className="p-4 bg-gray-50 rounded-md text-sm whitespace-pre-wrap max-h-96 overflow-y-auto border border-gray-200">
                    {result.originalText && result.originalText.length > 5000 
                      ? result.originalText.substring(0, 5000) + '... (text truncated for display)'
                      : result.originalText}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}

      <div className="flex justify-center mt-6">
        <Button 
          variant="outline" 
          size="lg" 
          onClick={() => onNewAnalysis(true)}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Start New Analysis
        </Button>
      </div>
      
      {/* Comprehensive Report Modal */}
      {currentReport && (
        <ComprehensiveReportModal 
          isOpen={isModalOpen}
          onClose={closeModal}
          report={currentReport}
        />
      )}
    </section>
  );
}