import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  FileSearch, 
  RefreshCw, 
  Download, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  FileDown,
  MessageSquarePlus,
  Eraser,
  Eye,
  EyeOff,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  generateAnalysis, 
  generateRecommendation, 
  modifyReport, 
  extractClientName, 
  generateContract,
  detectPensionType,
  detectMissingContractData,
  FileData 
} from './services/geminiService';
import { exportToDocx } from './utils/docxExport';

export default function App() {
  const [files, setFiles] = useState<(FileData & { id: string })[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [contract, setContract] = useState<string | null>(null);
  const [instructions, setInstructions] = useState('');
  const [recInstructions, setRecInstructions] = useState('');
  const [contractManualData, setContractManualData] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [pensionType, setPensionType] = useState<'vejez-invalidez' | 'sobrevivencia' | null>(null);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [isDetectingFields, setIsDetectingFields] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(true);
  const [showContract, setShowContract] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check API key on first interaction
    try {
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        if (!selected) {
          await (window as any).aistudio.openSelectKey();
        }
        setHasApiKey(true);
      }
    } catch (err) {
      console.warn("API Key selection error:", err);
    }

    const uploadedFiles = Array.from(e.target.files);
    if (uploadedFiles.length === 0) return;

    const filePromises = uploadedFiles.map(file => {
      // Limitar a 10MB por archivo para evitar problemas de memoria en el navegador
      if (file.size > 10 * 1024 * 1024) {
        return Promise.reject(new Error(`El archivo ${file.name} es demasiado grande (máx 10MB)`));
      }
      return new Promise<FileData & { id: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              mimeType: file.type,
              data: base64
            });
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error(`Error al leer el archivo ${file.name}`));
        reader.readAsDataURL(file);
      });
    });

    try {
      const newFiles = await Promise.all(filePromises);
      setFiles(prev => [...prev, ...newFiles]);
    } catch (err) {
      console.error("Error uploading files:", err);
      setError("Hubo un problema al cargar uno o más archivos.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleGenerateAnalysis = async () => {
    if (files.length === 0) return;
    
    setIsAnalyzing(true);
    setError(null);
    setIsSidebarOpen(false); // Close sidebar on mobile
    try {
      console.log("Iniciando análisis con", files.length, "archivos...");
      const result = await generateAnalysis(files);
      if (!result || result.includes("No se pudo generar")) {
        throw new Error("La IA no devolvió un resultado válido.");
      }
      setReport(result);
      
      // Auto detect pension type and missing fields
      setIsDetectingFields(true);
      try {
        console.log("Detectando tipo de pensión y campos faltantes...");
        const type = await detectPensionType(result);
        setPensionType(type);
        const fields = await detectMissingContractData(result, type);
        setMissingFields(fields);
        // Initialize field values
        const initialValues: Record<string, string> = {};
        fields.forEach(f => initialValues[f] = "");
        setFieldValues(initialValues);
      } catch (err) {
        console.error("Error detecting fields:", err);
        // No bloqueamos el flujo principal si falla la detección automática
      } finally {
        setIsDetectingFields(false);
      }
    } catch (err: any) {
      console.error("Error en handleGenerateAnalysis:", err);
      const errorMessage = err.message || 'Error desconocido';
      setError(`Error al generar el análisis: ${errorMessage}. Por favor, verifica tu conexión o intenta con menos archivos.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddRecommendation = async () => {
    if (!report || !recInstructions) return;
    
    setIsAnalyzing(true);
    try {
      const rec = await generateRecommendation(report, recInstructions);
      setReport(prev => prev + "\n\n" + rec);
      setRecInstructions('');
    } catch (err) {
      console.error(err);
      setError('Error al añadir la recomendación.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleModify = async () => {
    if (!report || !instructions) return;
    
    setIsAnalyzing(true);
    try {
      const updated = await modifyReport(report, instructions);
      setReport(updated);
      setInstructions('');
    } catch (err) {
      console.error(err);
      setError('Error al modificar el informe.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewReport = () => {
    setReport(null);
    setContract(null);
    setFiles([]);
    setInstructions('');
    setRecInstructions('');
    setContractManualData('');
    setMissingFields([]);
    setFieldValues({});
    setPensionType(null);
    setError(null);
  };

  const handleGenerateContract = async () => {
    if (!report || !pensionType) return;
    setIsGeneratingContract(true);
    setError(null);
    setIsSidebarOpen(false); // Close sidebar on mobile
    try {
      // Combine manual field values into a single string
      const manualData = Object.entries(fieldValues)
        .filter(([_, val]) => val.trim().length > 0)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ');
        
      const result = await generateContract(report, pensionType, manualData);
      setContract(result);
    } catch (err: any) {
      console.error(err);
      setError(`Error al generar el contrato: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsGeneratingContract(false);
    }
  };

  const handleExport = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      const clientName = await extractClientName(report);
      await exportToDocx(report, clientName, 'informe');
    } catch (err) {
      console.error(err);
      setError('Error al exportar el informe.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportContract = async () => {
    if (!contract || !report) return;
    setIsExporting(true);
    try {
      const clientName = await extractClientName(report);
      await exportToDocx(contract, clientName, 'contrato');
    } catch (err) {
      console.error(err);
      setError('Error al exportar el contrato.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans flex relative">
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-80 bg-white border-r border-[#E5E7EB] flex flex-col shadow-sm shrink-0 transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-bottom border-[#E5E7EB]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <ShieldCheck size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Asesor IA</h1>
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Sistema Previsional Chileno</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">1. Cargar Antecedentes</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group"
            >
              <Upload className="text-gray-400 group-hover:text-emerald-600 mb-2 transition-colors" size={24} />
              <span className="text-xs text-gray-500 font-medium">PDF o Imágenes</span>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                multiple 
                accept="application/pdf,image/*" 
                className="hidden" 
              />
            </div>
          </div>

          {/* File List */}
          <AnimatePresence>
            {files.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                {files.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText size={16} className="text-emerald-600 shrink-0" />
                      <span className="text-xs font-medium truncate">{file.name}</span>
                    </div>
                    <button 
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button */}
          <button
            onClick={handleGenerateAnalysis}
            disabled={files.length === 0 || isAnalyzing}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              files.length === 0 || isAnalyzing
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
            }`}
          >
            {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <FileSearch size={18} />}
            {isAnalyzing ? 'Procesando...' : 'Generar Análisis (1-5)'}
          </button>

          {/* Modification Section */}
          {report && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-6 border-t border-gray-100 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modificar Informe</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ej: 'Cambia el tono a más formal'..."
                  className="w-full h-24 p-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none placeholder:text-gray-400"
                />
                <button
                  onClick={handleModify}
                  disabled={!instructions || isAnalyzing}
                  className="w-full mt-2 py-2 text-emerald-600 font-semibold text-sm hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} className={isAnalyzing ? 'animate-spin' : ''} />
                  Refrescar Informe
                </button>
              </div>

              {/* Contract Generation Controls */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <label className="block text-sm font-medium text-gray-700">3. Contrato de Asesoría</label>
                
                {isDetectingFields ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse">
                    <RefreshCw className="animate-spin" size={12} />
                    Detectando datos faltantes...
                  </div>
                ) : missingFields.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Datos Requeridos</p>
                    {missingFields.map(field => (
                      <div key={field} className="space-y-1">
                        <label className="text-[10px] text-gray-500 font-medium">{field}</label>
                        <input
                          type="text"
                          value={fieldValues[field] || ""}
                          onChange={(e) => setFieldValues(prev => ({ ...prev, [field]: e.target.value }))}
                          placeholder={`Ingresar ${field.toLowerCase()}`}
                          className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">Todos los datos detectados automáticamente.</p>
                )}

                <button
                  onClick={handleGenerateContract}
                  disabled={isGeneratingContract || isAnalyzing || isDetectingFields}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
                >
                  {isGeneratingContract ? <RefreshCw className="animate-spin" size={18} /> : <FileText size={18} />}
                  {isGeneratingContract ? 'Generando Contrato...' : 'Generar Contrato de Asesoría'}
                </button>
                
                {pensionType && (
                  <p className="text-[10px] text-center text-gray-400">
                    Tipo detectado: <span className="font-bold text-emerald-600 uppercase">{pensionType.replace('-', '/')}</span>
                  </p>
                )}
              </div>

              <button
                onClick={handleNewReport}
                className="w-full py-2 text-gray-500 font-semibold text-sm hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Eraser size={16} />
                Nuevo Informe
              </button>
            </motion.div>
          )}
        </div>

        <div className="p-6 border-t border-[#E5E7EB] bg-gray-50">
          <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold tracking-widest">
            <ShieldCheck size={12} />
            Privacidad Garantizada
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] px-4 lg:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-500 overflow-hidden">
            <span className="hidden sm:inline">Dashboard</span>
            <ChevronRight size={14} className="hidden sm:inline" />
            <span className="font-medium text-gray-900 truncate">Informe Técnico</span>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-3 mr-12 lg:mr-0">
            {report && (
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-gray-900 text-white rounded-lg text-xs lg:text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400"
              >
                {isExporting ? <RefreshCw className="animate-spin" size={14} /> : <FileDown size={14} />}
                <span className="hidden sm:inline">{isExporting ? 'Exportando...' : 'Informe.docx'}</span>
                <span className="sm:hidden">Inf.</span>
              </button>
            )}

            {contract && (
              <button 
                onClick={handleExportContract}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs lg:text-sm font-medium hover:bg-emerald-700 transition-colors disabled:bg-gray-400"
              >
                {isExporting ? <RefreshCw className="animate-spin" size={14} /> : <FileDown size={14} />}
                <span className="hidden sm:inline">{isExporting ? 'Exportando...' : 'Contrato.docx'}</span>
                <span className="sm:hidden">Cont.</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {!report && !isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <FileSearch size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Listo para analizar</h2>
              <p className="text-gray-500">Carga los documentos del cliente en el panel lateral para generar el informe previsional automatizado.</p>
            </div>
          )}

          {isAnalyzing && !report && (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-600 animate-pulse">La IA está procesando los documentos...</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {report && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-600" size={20} />
                    <h3 className="font-bold text-gray-900">Informe de Asesoría Previsional</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowReport(!showReport)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      title={showReport ? "Ocultar Informe" : "Mostrar Informe"}
                    >
                      {showReport ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <span className="hidden sm:inline text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-wider">Borrador Generado</span>
                  </div>
                </div>
                <AnimatePresence>
                  {showReport && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-8 prose prose-emerald max-w-none">
                        <div className="markdown-body">
                          <Markdown remarkPlugins={[remarkGfm]}>{report}</Markdown>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Recommendation Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <MessageSquarePlus className="text-emerald-600" size={24} />
                  <h3 className="text-xl font-bold text-gray-900">2. Añadir Recomendación Final (Sección 6)</h3>
                </div>
                <textarea
                  value={recInstructions}
                  onChange={(e) => setRecInstructions(e.target.value)}
                  placeholder="Escribe aquí tus instrucciones para la recomendación final (ej: 'Recomendar RVA a 60 meses')..."
                  className="w-full h-32 p-4 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none placeholder:text-gray-400 mb-4"
                />
                <button
                  onClick={handleAddRecommendation}
                  disabled={!recInstructions || isAnalyzing}
                  className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    !recInstructions || isAnalyzing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
                  }`}
                >
                  {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <MessageSquarePlus size={18} />}
                  Añadir Recomendación al Informe
                </button>
              </div>

              {/* Contract Display */}
              {contract && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden"
                >
                  <div className="px-8 py-6 border-b border-emerald-100 bg-emerald-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="text-emerald-600" size={20} />
                      <h3 className="font-bold text-gray-900">Contrato de Asesoría Previsional</h3>
                    </div>
                    <button 
                      onClick={() => setShowContract(!showContract)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      title={showContract ? "Ocultar Contrato" : "Mostrar Contrato"}
                    >
                      {showContract ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {showContract && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-8 prose prose-emerald max-w-none">
                          <div className="markdown-body">
                            <Markdown remarkPlugins={[remarkGfm]}>{contract}</Markdown>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
