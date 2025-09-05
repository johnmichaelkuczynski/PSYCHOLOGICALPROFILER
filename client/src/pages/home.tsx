import { useState } from "react";
import IntroSection from "@/components/IntroSection";
import InputSection from "@/components/InputSection";
import ProcessingIndicator from "@/components/ProcessingIndicator";
import ResultsSection from "@/components/ResultsSection";
import SimplePsychologicalResults from "@/components/SimplePsychologicalResults";
import ErrorSection from "@/components/ErrorSection";
import HelpModal from "@/components/HelpModal";
import Footer from "@/components/Footer";
import UserAccountBar from "@/components/UserAccountBar";
import AuthModal from "@/components/AuthModal";
import PaymentModal from "@/components/PaymentModal";
import TokenLimitModal from "@/components/TokenLimitModal";
import { useAuth } from "@/contexts/AuthContext";
import { useCognitiveAnalysis } from "@/hooks/useCognitiveAnalysis";
import { usePsychologicalAnalysis } from "@/hooks/usePsychologicalAnalysis";
import { AnalysisType } from "@/types/analysis";
import { AlertCircle, BrainCircuit, Heart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  const [showHelp, setShowHelp] = useState(false);
  const [textSample, setTextSample] = useState("");
  const [analysisType, setAnalysisType] = useState<AnalysisType>("cognitive");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTokenLimitModal, setShowTokenLimitModal] = useState(false);
  const [tokenLimitInfo, setTokenLimitInfo] = useState<{
    type: 'free_limit' | 'insufficient_tokens' | 'upload_blocked';
    message: string;
    currentBalance?: number;
    requiredTokens?: number;
  }>({
    type: 'free_limit',
    message: ''
  });
  
  const { user, login, logout, refreshUser } = useAuth();
  
  // Cognitive analysis hook
  const {
    analyzeText: analyzeCognitiveText,
    analyzeFile: analyzeCognitiveFile,
    isLoading: isCognitiveLoading,
    isError: isCognitiveError,
    error: cognitiveError,
    data: cognitiveResult,
    reset: resetCognitive
  } = useCognitiveAnalysis();
  
  // Psychological analysis hook
  const {
    analyzeText: analyzePsychologicalText,
    analyzeFile: analyzePsychologicalFile,
    isLoading: isPsychologicalLoading,
    isError: isPsychologicalError,
    error: psychologicalError,
    data: psychologicalResult,
    reset: resetPsychological
  } = usePsychologicalAnalysis();

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextSample(e.target.value);
  };

  const handleAnalysisTypeChange = (value: string) => {
    setAnalysisType(value as AnalysisType);
  };

  const handleAnalyze = () => {
    if (textSample.length < 100) {
      return;
    }
    
    // Analyze with the selected analysis type
    if (analysisType === "cognitive") {
      analyzeCognitiveText(textSample);
    } else {
      analyzePsychologicalText(textSample);
    }
  };

  const handleAuthSuccess = (userData: any) => {
    login(userData);
    refreshUser();
  };

  const handlePaymentSuccess = () => {
    refreshUser();
  };

  const handleShowTokenLimit = (type: 'free_limit' | 'insufficient_tokens' | 'upload_blocked', message: string, currentBalance?: number, requiredTokens?: number) => {
    setTokenLimitInfo({
      type,
      message,
      currentBalance,
      requiredTokens
    });
    setShowTokenLimitModal(true);
  };

  const handleTokenLimitRegister = () => {
    setShowTokenLimitModal(false);
    setShowAuthModal(true);
  };

  const handleTokenLimitBuyCredits = () => {
    setShowTokenLimitModal(false);
    if (user) {
      setShowPaymentModal(true);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleReset = (clearText: boolean = true) => {
    // Reset both analysis types to ensure a clean state
    resetCognitive();
    resetPsychological();
    
    // Only clear the text input if clearText is true
    if (clearText) {
      setTextSample("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if this is a text file (for simple reading) or a document (for server processing)
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'txt' || fileExt === 'text') {
      // For text files, use client-side reading
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setTextSample(text);
      };
      reader.readAsText(file);
    } else if (fileExt === 'pdf' || fileExt === 'doc' || fileExt === 'docx') {
      // For PDF, Word documents - send directly to server for processing
      if (analysisType === "cognitive") {
        analyzeCognitiveFile(file);
      } else {
        analyzePsychologicalFile(file);
      }
    } else {
      // For unsupported formats
      console.error("Unsupported file format");
      // You could set an error state here and show a message to the user
    }
  };

  // Determine loading, error and result states based on the current analysis type
  const isLoading = analysisType === "cognitive" ? isCognitiveLoading : isPsychologicalLoading;
  const isError = analysisType === "cognitive" ? isCognitiveError : isPsychologicalError;
  const error = analysisType === "cognitive" ? cognitiveError : psychologicalError;
  const hasResult = analysisType === "cognitive" ? !!cognitiveResult : !!psychologicalResult;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h1 className="font-heading font-bold text-xl sm:text-2xl text-secondary">Mind Profiler</h1>
            </div>
            <a 
              href="mailto:contact@zhisystems.ai" 
              className="text-sm font-medium text-neutral-600 hover:text-primary transition-colors"
            >
              CONTACT US
            </a>
          </div>
          
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setShowHelp(true)}
              className="text-neutral-600 hover:text-primary p-2 rounded-full transition"
            >
              <AlertCircle className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-6 sm:py-8 md:py-12">
        {/* User Account Bar */}
        <UserAccountBar 
          user={user}
          onLogin={() => setShowAuthModal(true)}
          onLogout={logout}
          onBuyCredits={() => setShowPaymentModal(true)}
        />
        
        {!isLoading && !hasResult && !isError && (
          <>
            <IntroSection 
              analysisType={analysisType}
              onAnalysisTypeChange={handleAnalysisTypeChange}
            />
            
            <InputSection 
              textSample={textSample}
              onTextChange={handleTextChange} 
              onAnalyze={handleAnalyze}
              onFileUpload={handleFileUpload}
              analysisType={analysisType}
            />
          </>
        )}
        
        {isLoading && (
          <ProcessingIndicator />
        )}
        
        {!isLoading && !isError && (
          <>
            {cognitiveResult && analysisType === "cognitive" && (
              <ResultsSection 
                result={cognitiveResult} 
                onNewAnalysis={handleReset}
              />
            )}
            
            {psychologicalResult && analysisType === "psychological" && (
              <SimplePsychologicalResults 
                result={psychologicalResult}
                onNewAnalysis={handleReset}
              />
            )}
          </>
        )}
        
        {isError && (
          <ErrorSection 
            errorMessage={error?.message || "We were unable to process your text. Please check your input and try again."}
            onDismiss={handleReset}
          />
        )}
      </main>

      <Footer />
      
      {showHelp && (
        <HelpModal 
          isOpen={showHelp} 
          onClose={() => setShowHelp(false)} 
        />
      )}
      
      {/* Authentication Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
      
      {/* Payment Modal */}
      {user && (
        <PaymentModal 
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          currentBalance={user.token_balance}
        />
      )}
      
      {/* Token Limit Modal */}
      <TokenLimitModal 
        isOpen={showTokenLimitModal}
        onClose={() => setShowTokenLimitModal(false)}
        onRegister={handleTokenLimitRegister}
        onBuyCredits={handleTokenLimitBuyCredits}
        limitType={tokenLimitInfo.type}
        message={tokenLimitInfo.message}
        currentBalance={tokenLimitInfo.currentBalance}
        requiredTokens={tokenLimitInfo.requiredTokens}
        isRegistered={!!user}
      />
    </div>
  );
}
