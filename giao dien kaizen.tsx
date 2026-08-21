import React, { useState, useEffect } from 'react';
import { 
  FileText, Lightbulb, TrendingUp, Save, Plus, Trash2, Image, 
  Calculator, CheckCircle, Clock, DollarSign, ShieldAlert,
  Search, Filter, Database, Code, Layout, ArrowRight, Check, AlertCircle, RefreshCw, Layers
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('idea'); // 'idea', 'report', 'list', 'docs'
  const [kaizenList, setKaizenList] = useState([
    {
      id: '003GAHR2026-01',
      date: '2026-07-07',
      dept: 'GAHR',
      proposer: 'Hoàng Thủy',
      checked: 'Kitamura',
      approved: 'Shiraga',
      content: 'Example: oil leaking - Rò rỉ dầu',
      classification: ['E', 'C'],
      status: 'Đã hoàn thành',
      sopNo: 'SOP-FIL-021',
      productName: 'Dòng sản phẩm A',
      process: 'chiết rót',
      target: 'Loại bỏ rò rỉ',
      targetDetail: '0L rò rỉ',
      beforeWorkHour: 5,
      afterWorkHour: 4,
      beforeNearMiss: 2,
      afterNearMiss: 1,
      dailyHoursSaved: 1,
      monthlyDays: 22,
      hourlyCost: 5.00,
      qualitativeEffect: 'Reduce risks 50% (Tăng độ an toàn khi vận hành máy)'
    }
  ]);

  // Form State
  const [formData, setFormData] = useState({
    kaizenId: '003GAHR2026-02',
    date: new Date().toISOString().split('T')[0],
    dept: 'GAHR',
    proposer: 'Hoàng Thủy',
    checked: 'Kitamura',
    approved: 'Shiraga',
    improvedContent: 'Rò rỉ dầu tại máy chiết rót số 2',
    classification: ['E', 'C'],
    sopNo: 'SOP-FIL-022',
    productName: 'Tên dòng sản phẩm liên quan',
    process: 'Chiết rót',
    target: 'Loại bỏ rò rỉ',
    targetDetail: '0L rò rỉ',
    
    // Idea Sheet specific
    problemDesc: 'Rò đáy. Tình trạng xác nhận tại điểm ghép khuôn, mối hàn đáy hay bị rò dầu',
    improvementPlan: 'Làm việc với NCC',
    improvementActions: 'Thay seal',
    riskIdentification: 'Không có rủi ro phát sinh',
    beforeIdeaImage: null,
    afterIdeaImage: null,

    // Report Sheet specific
    beforeDescription: 'Mô tả hiện trạng trước cải tiến: Dầu loang ra sàn máy chiết, gây nguy cơ trượt ngã và lãng phí vật tư.',
    afterDescription: 'Mô tả giải pháp cải tiến: Đã thiết kế lại gioăng cao su chịu nhiệt và lắp khay hứng phụ.',
    materialsAndCost: 'Vật tư: Gioăng chịu nhiệt NBR, Khay inox 304. Chi phí: 15 USD',
    beforeReportImage: null,
    afterReportImage: null,

    // Calculations
    beforeWorkHour: 5,
    afterWorkHour: 4,
    beforeNearMiss: 2,
    afterNearMiss: 1,
    dailyHoursSaved: 1,
    monthlyDays: 22,
    hourlyCost: 5.00,
    qualitativeEffect: 'Tăng mức độ an toàn lao động, giảm 50% nguy cơ trượt ngã tại khu vực sản xuất'
  });

  const [notification, setNotification] = useState(null);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Calculated fields
  const diffWorkHour = formData.afterWorkHour - formData.beforeWorkHour;
  const diffNearMiss = formData.afterNearMiss - formData.beforeNearMiss;
  const totalCostSavings = (formData.dailyHoursSaved * formData.monthlyDays * formData.hourlyCost).toFixed(2);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClassificationToggle = (code) => {
    setFormData(prev => {
      const current = prev.classification || [];
      if (current.includes(code)) {
        return { ...prev, classification: current.filter(c => c !== code) };
      } else {
        return { ...prev, classification: [...current, code] };
      }
    });
  };

  const handleSaveKaizen = () => {
    const newEntry = {
      ...formData,
      id: formData.kaizenId,
      status: activeTab === 'idea' ? 'Ý tưởng mới' : 'Đã nghiệm thu'
    };
    
    setKaizenList([newEntry, ...kaizenList]);
    showToast(`Đã lưu thành công ${formData.kaizenId} vào SharePoint / Dataverse!`);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-5 h-5" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Microsoft Power Apps Header Bar */}
      <header className="bg-purple-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-purple-700 p-2 rounded-lg font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-200" />
            <span>Power Apps Canvas</span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Hệ Thống Quản Lý & Nhập Liệu Kaizen</h1>
            <p className="text-xs text-purple-200">Ứng dụng thay thế Excel thủ công cho Nhà máy / Xưởng sản xuất</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleSaveKaizen}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 shadow transition"
          >
            <Save className="w-4 h-4" />
            <span>Lưu dữ liệu (Patch)</span>
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-slate-200 px-6 flex space-x-1 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('idea')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'idea' 
              ? 'border-purple-700 text-purple-800 bg-purple-50/50' 
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <span>1. Phiếu Ý Tưởng Kaizen</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'report' 
              ? 'border-purple-700 text-purple-800 bg-purple-50/50' 
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>2. Báo Cáo Kết Quả Kaizen</span>
        </button>

        <button
          onClick={() => setActiveTab('list')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'list' 
              ? 'border-purple-700 text-purple-800 bg-purple-50/50' 
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4 text-blue-600" />
          <span>3. Danh Sách / Dataverse ({kaizenList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'docs' 
              ? 'border-purple-700 text-purple-800 bg-purple-50/50' 
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Code className="w-4 h-4 text-indigo-600" />
          <span>4. Công Thức & Thiết Kế Power Fx</span>
        </button>
      </nav>

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">

        {/* ----------------- TAB 1: PHIẾU Y TƯỞNG KAIZEN ----------------- */}
        {activeTab === 'idea' && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header section matching Excel Sheet */}
            <div className="bg-emerald-800 text-white p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-wide uppercase flex items-center gap-2">
                  <Lightbulb className="w-6 h-6 text-amber-300" />
                  PHIẾU LẬP Ý TƯỞNG KAIZEN (KAIZEN IDEA SHEET)
                </h2>
                <p className="text-xs text-emerald-100">Ghi nhận thông tin thực trạng, nguyên nhân & giải pháp dự kiến</p>
              </div>

              <div className="bg-emerald-900/60 p-2 rounded-lg border border-emerald-700/50 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-emerald-300 block font-medium">Mã Kaizen:</span>
                  <input 
                    type="text" 
                    value={formData.kaizenId} 
                    onChange={e => handleInputChange('kaizenId', e.target.value)}
                    className="bg-white text-slate-900 font-bold px-2 py-1 rounded w-full border border-slate-300" 
                  />
                </div>
                <div>
                  <span className="text-emerald-300 block font-medium">Ngày (Date):</span>
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => handleInputChange('date', e.target.value)}
                    className="bg-white text-slate-900 font-bold px-2 py-1 rounded w-full border border-slate-300" 
                  />
                </div>
                <div>
                  <span className="text-emerald-300 block font-medium">Bộ phận (Dept):</span>
                  <input 
                    type="text" 
                    value={formData.dept} 
                    onChange={e => handleInputChange('dept', e.target.value)}
                    className="bg-white text-slate-900 font-bold px-2 py-1 rounded w-full border border-slate-300" 
                  />
                </div>
                <div>
                  <span className="text-emerald-300 block font-medium">Người đề xuất:</span>
                  <input 
                    type="text" 
                    value={formData.proposer} 
                    onChange={e => handleInputChange('proposer', e.target.value)}
                    className="bg-white text-slate-900 font-bold px-2 py-1 rounded w-full border border-slate-300" 
                  />
                </div>
              </div>
            </div>

            {/* Approval Row */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 w-24">Người duyệt (Approved):</span>
                <input 
                  type="text" 
                  value={formData.approved} 
                  onChange={e => handleInputChange('approved', e.target.value)}
                  className="flex-1 border rounded px-3 py-1.5 text-sm font-semibold text-emerald-800 bg-white" 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 w-24">Kiểm tra (Checked):</span>
                <input 
                  type="text" 
                  value={formData.checked} 
                  onChange={e => handleInputChange('checked', e.target.value)}
                  className="flex-1 border rounded px-3 py-1.5 text-sm font-semibold text-emerald-800 bg-white" 
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 w-24">Đề xuất (Proposer):</span>
                <input 
                  type="text" 
                  value={formData.proposer} 
                  onChange={e => handleInputChange('proposer', e.target.value)}
                  className="flex-1 border rounded px-3 py-1.5 text-sm font-semibold text-emerald-800 bg-white" 
                />
              </div>
            </div>

            {/* Content & Classification */}
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-200 bg-white">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Nội dung cải tiến (Improved Content) <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  value={formData.improvedContent}
                  onChange={e => handleInputChange('improvedContent', e.target.value)}
                  placeholder="Ví dụ: Example: oil leaking - Rò rỉ dầu" 
                  className="w-full border-2 border-slate-300 focus:border-purple-600 rounded-lg p-2.5 text-red-600 font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Loại vấn đề (Classification: S/Q/P/C/E/W)
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { code: 'S', label: 'Safety (An toàn)' },
                    { code: 'Q', label: 'Quality (Chất lượng)' },
                    { code: 'P', label: 'Productivity (Năng suất)' },
                    { code: 'C', label: 'Cost (Chi phí)' },
                    { code: 'E', label: 'Environment (Môi trường)' },
                    { code: 'W', label: 'Work (Môi trường làm việc)' },
                  ].map(item => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleClassificationToggle(item.code)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md border transition ${
                        formData.classification.includes(item.code)
                          ? 'bg-purple-700 text-white border-purple-800 shadow'
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {item.code} - {item.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Form Split: Before vs After Target */}
            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
              
              {/* Left Column: Before Status */}
              <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="bg-amber-100 border-l-4 border-amber-500 p-2 mb-4">
                    <h3 className="font-bold text-amber-900 text-sm">THỰC TRẠNG TRƯỚC CẢI TIẾN (BEFORE STATUS)</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        1. Mô tả vấn đề (bối cảnh) / Problem Description:
                      </label>
                      <textarea 
                        rows={2}
                        value={formData.problemDesc}
                        onChange={e => handleInputChange('problemDesc', e.target.value)}
                        className="w-full border border-slate-300 rounded p-2 text-sm text-red-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phân tích hiện trạng (Current Analysis):
                      </label>
                      <textarea 
                        rows={2}
                        value={formData.problemDesc}
                        onChange={e => handleInputChange('problemDesc', e.target.value)}
                        placeholder="Tình trạng xác nhận tại điểm ghép khuôn, mối hàn đáy hay bị rò dầu"
                        className="w-full border border-slate-300 rounded p-2 text-sm text-red-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        2. Kế hoạch cải tiến / Improvement Plan:
                      </label>
                      <input 
                        type="text"
                        value={formData.improvementPlan}
                        onChange={e => handleInputChange('improvementPlan', e.target.value)}
                        className="w-full border border-slate-300 rounded p-2 text-sm text-red-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        3. Hành động cải tiến / Improvement Actions:
                      </label>
                      <input 
                        type="text"
                        value={formData.improvementActions}
                        onChange={e => handleInputChange('improvementActions', e.target.value)}
                        className="w-full border border-slate-300 rounded p-2 text-sm text-red-600 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        4. Nhận diện rủi ro (nếu có) / Risk Identification (if any):
                      </label>
                      <input 
                        type="text"
                        value={formData.riskIdentification}
                        onChange={e => handleInputChange('riskIdentification', e.target.value)}
                        className="w-full border border-slate-300 rounded p-2 text-sm text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Upload Before Photo */}
                <div className="mt-6 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center bg-slate-50 hover:bg-slate-100 transition cursor-pointer">
                  <Image className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-slate-600">Đính kèm ảnh hiện trạng trước cải tiến (Before Image)</p>
                  <p className="text-[10px] text-slate-400">Hỗ trợ JPG, PNG (Chụp ảnh trực tiếp từ Power Apps Mobile)</p>
                </div>
              </div>

              {/* Right Column: After Targeting Results */}
              <div className="bg-white p-5 rounded-lg border border-slate-300 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="bg-emerald-100 border-l-4 border-emerald-500 p-2 mb-4">
                    <h3 className="font-bold text-emerald-900 text-sm">KẾT QUẢ ĐẠT ĐƯỢC SAU CẢI TIẾN (AFTER TARGETING RESULTS)</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Mô tả kết quả kỳ vọng / Mô phỏng giải pháp:
                      </label>
                      <textarea 
                        rows={6}
                        value={formData.afterDescription}
                        onChange={e => handleInputChange('afterDescription', e.target.value)}
                        placeholder="Mô tả hình ảnh mô phỏng kết quả sau khi thực hiện cải tiến..."
                        className="w-full border border-slate-300 rounded p-2 text-sm text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Upload After/Design Photo */}
                <div className="mt-6 border-2 border-dashed border-emerald-300 rounded-lg p-4 text-center bg-emerald-50/50 hover:bg-emerald-50 transition cursor-pointer">
                  <Image className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-emerald-800">Đính kèm ảnh bản vẽ / mô phỏng kết quả (After Image)</p>
                  <p className="text-[10px] text-emerald-600">Tải lên thiết kế hoặc ảnh minh họa giải pháp mới</p>
                </div>
              </div>

            </div>

            {/* Bottom Form Actions */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">Tự động đồng bộ dữ liệu vào SharePoint List KaizenIdeas</span>
              <div className="flex gap-3">
                <button 
                  onClick={() => setActiveTab('report')}
                  className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow"
                >
                  <span>Chuyển sang Báo Cáo Kaizen</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}


        {/* ----------------- TAB 2: BÁO CÁO KẾT QUẢ KAIZEN ----------------- */}
        {activeTab === 'report' && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header section matching Excel Sheet */}
            <div className="bg-blue-900 text-white p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-wide uppercase flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                  KAIZEN REPORT (BÁO CÁO NGHIỆM THU CẢI TIẾN)
                </h2>
                <p className="text-xs text-blue-200">Đánh giá hiệu quả định lượng (Chi phí, Giờ làm việc) & định tính (An toàn)</p>
              </div>

              <div className="bg-blue-950 p-2 rounded-lg border border-blue-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-blue-300 block font-medium">Mã Kaizen:</span>
                  <input 
                    type="text" 
                    value={formData.kaizenId} 
                    onChange={e => handleInputChange('kaizenId', e.target.value)}
                    className="bg-white text-slate-900 font-bold px-2 py-1 rounded w-full border border-slate-300" 
                  />
                </div>
                <div>
                  <span className="text-blue-300 block font-medium">Ngày (Date):</span>
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => handleInputChange('date', e.target.value)}
                    className="bg-white text-slate-900 font-bold px-2 py-1 rounded w-full border border-slate-300" 
                  />
                </div>
                <div>
                  <span className="text-blue-300 block font-medium">Bộ phận (Dept):</span>
                  <input 
                    type="text" 
                    value={formData.dept} 
                    onChange={e => handleInputChange('dept', e.target.value)}
                    className="bg-white text-slate-900 font-bold px-2 py-1 rounded w-full border border-slate-300" 
                  />
                </div>
                <div>
                  <span className="text-blue-300 block font-medium">SOP Liên Quan:</span>
                  <input 
                    type="text" 
                    value={formData.sopNo} 
                    onChange={e => handleInputChange('sopNo', e.target.value)}
                    className="bg-white text-slate-900 font-bold px-2 py-1 rounded w-full border border-slate-300" 
                  />
                </div>
              </div>
            </div>

            {/* Product & Process Meta */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold">
              <div>
                <label className="text-slate-600 block mb-1">Tên dòng sản phẩm liên quan:</label>
                <input 
                  type="text" 
                  value={formData.productName} 
                  onChange={e => handleInputChange('productName', e.target.value)}
                  className="w-full border rounded p-1.5 text-red-600 font-bold bg-white" 
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Công đoạn (Process):</label>
                <input 
                  type="text" 
                  value={formData.process} 
                  onChange={e => handleInputChange('process', e.target.value)}
                  className="w-full border rounded p-1.5 text-slate-800 font-bold bg-white" 
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Mục tiêu (Target):</label>
                <input 
                  type="text" 
                  value={formData.target} 
                  onChange={e => handleInputChange('target', e.target.value)}
                  className="w-full border rounded p-1.5 text-red-600 font-bold bg-white" 
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Chi tiết mục tiêu (Details):</label>
                <input 
                  type="text" 
                  value={formData.targetDetail} 
                  onChange={e => handleInputChange('targetDetail', e.target.value)}
                  className="w-full border rounded p-1.5 text-red-600 font-bold bg-white" 
                />
              </div>
            </div>

            {/* Before / Materials / After Sections */}
            <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 border-b border-slate-200">
              
              {/* Before */}
              <div className="border border-slate-300 rounded-lg p-3 bg-amber-50/30">
                <div className="font-bold text-amber-900 text-xs uppercase mb-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>《Before》 MÔ TẢ HIỆN TRẠNG TRƯỚC CẢI TIẾN</span>
                </div>
                <textarea 
                  rows={4}
                  value={formData.beforeDescription}
                  onChange={e => handleInputChange('beforeDescription', e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs text-red-600 font-medium bg-white"
                />
                <div className="mt-2 border border-dashed border-slate-300 rounded p-3 text-center bg-white cursor-pointer">
                  <Image className="w-6 h-6 text-slate-400 mx-auto" />
                  <span className="text-[11px] text-slate-500">Ảnh hiện trạng Before</span>
                </div>
              </div>

              {/* Materials & Cost */}
              <div className="border border-slate-300 rounded-lg p-3 bg-blue-50/30">
                <div className="font-bold text-blue-900 text-xs uppercase mb-2 flex items-center gap-1">
                  <Calculator className="w-4 h-4 text-blue-600" />
                  <span>VẬT TƯ & CHI PHÍ THỰC HIỆN KAIZEN</span>
                </div>
                <textarea 
                  rows={4}
                  value={formData.materialsAndCost}
                  onChange={e => handleInputChange('materialsAndCost', e.target.value)}
                  placeholder="Ghi nhận các vật tư, thiết bị sử dụng và tổng chi phí đầu tư..."
                  className="w-full border border-slate-300 rounded p-2 text-xs text-red-600 font-medium bg-white"
                />
                <div className="mt-2 p-2 bg-blue-100 rounded text-[11px] text-blue-900 font-semibold">
                  Ghi rõ danh mục đầu tư vật tư để tính ROI
                </div>
              </div>

              {/* After */}
              <div className="border border-slate-300 rounded-lg p-3 bg-emerald-50/30">
                <div className="font-bold text-emerald-900 text-xs uppercase mb-2 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>《After》 MÔ TẢ GIẢI PHÁP CẢI TIẾN</span>
                </div>
                <textarea 
                  rows={4}
                  value={formData.afterDescription}
                  onChange={e => handleInputChange('afterDescription', e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs text-slate-800 font-medium bg-white"
                />
                <div className="mt-2 border border-dashed border-emerald-300 rounded p-3 text-center bg-white cursor-pointer">
                  <Image className="w-6 h-6 text-emerald-500 mx-auto" />
                  <span className="text-[11px] text-emerald-700">Ảnh thực tế After</span>
                </div>
              </div>

            </div>

            {/* CALCULATIONS & METRICS BOARD (Chức năng tính toán tự động trong Excel/PowerApps) */}
            <div className="p-4 md:p-6 bg-slate-100">
              <h3 className="font-bold text-slate-800 text-sm uppercase mb-3 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-purple-700" />
                <span>BẢNG TÍNH TOÁN HIỆU QUẢ CẢI TIẾN (AUTOMATED METRICS CALCULATOR)</span>
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* Genba & Office Productivity */}
                <div className="lg:col-span-4 bg-white p-4 rounded-xl border border-slate-300 shadow-sm">
                  <h4 className="font-bold text-xs text-slate-700 border-b pb-2 mb-3">
                    1. Năng suất / Giờ làm việc & Near-miss (Genba)
                  </h4>

                  <div className="space-y-3">
                    {/* Work Hour Row */}
                    <div className="grid grid-cols-3 gap-2 items-center text-xs">
                      <span className="font-semibold text-slate-600">Work Hour (Trước):</span>
                      <input 
                        type="number" 
                        value={formData.beforeWorkHour}
                        onChange={e => handleInputChange('beforeWorkHour', Number(e.target.value))}
                        className="border rounded p-1 text-center font-bold bg-amber-50" 
                      />
                      <span className="text-right text-slate-500">Giờ/ngày</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center text-xs">
                      <span className="font-semibold text-slate-600">Work Hour (Sau):</span>
                      <input 
                        type="number" 
                        value={formData.afterWorkHour}
                        onChange={e => handleInputChange('afterWorkHour', Number(e.target.value))}
                        className="border rounded p-1 text-center font-bold bg-emerald-50" 
                      />
                      <span className={`text-right font-bold ${diffWorkHour <= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        Hiệu quả: {diffWorkHour}h
                      </span>
                    </div>

                    <hr />

                    {/* Near miss Row */}
                    <div className="grid grid-cols-3 gap-2 items-center text-xs">
                      <span className="font-semibold text-slate-600">Near-miss (Trước):</span>
                      <input 
                        type="number" 
                        value={formData.beforeNearMiss}
                        onChange={e => handleInputChange('beforeNearMiss', Number(e.target.value))}
                        className="border rounded p-1 text-center font-bold bg-amber-50" 
                      />
                      <span className="text-right text-slate-500">Vụ/tháng</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center text-xs">
                      <span className="font-semibold text-slate-600">Near-miss (Sau):</span>
                      <input 
                        type="number" 
                        value={formData.afterNearMiss}
                        onChange={e => handleInputChange('afterNearMiss', Number(e.target.value))}
                        className="border rounded p-1 text-center font-bold bg-emerald-50" 
                      />
                      <span className="text-right font-bold text-emerald-600">
                        Giảm: {diffNearMiss} rủi ro
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cost Improvement Calculator */}
                <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-700 border-b pb-2 mb-3 flex justify-between items-center">
                      <span>2. Tính toán cắt giảm chi phí (Cost Reduction)</span>
                      <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono">Tự động</span>
                    </h4>

                    <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          ① Giờ tiết kiệm/ngày:
                        </label>
                        <input 
                          type="number" 
                          value={formData.dailyHoursSaved}
                          onChange={e => handleInputChange('dailyHoursSaved', Number(e.target.value))}
                          className="w-full border rounded p-1 text-center font-bold bg-white" 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Số ngày làm việc/tháng:
                        </label>
                        <input 
                          type="number" 
                          value={formData.monthlyDays}
                          onChange={e => handleInputChange('monthlyDays', Number(e.target.value))}
                          className="w-full border rounded p-1 text-center font-bold bg-white" 
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Lương bình quân ($/h):
                        </label>
                        <input 
                          type="number" 
                          step="0.5"
                          value={formData.hourlyCost}
                          onChange={e => handleInputChange('hourlyCost', Number(e.target.value))}
                          className="w-full border rounded p-1 text-center font-bold bg-white" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Total Result Card */}
                  <div className="bg-yellow-300 border-2 border-yellow-500 rounded-lg p-3 text-center shadow-inner">
                    <span className="text-xs font-bold text-slate-800 block">TỔNG GIÁ TRỊ TIẾT KIỆM (REDUCTION IMPACT)</span>
                    <div className="text-2xl font-black text-slate-900 mt-1 flex items-center justify-center gap-1">
                      <span>${totalCostSavings}</span>
                      <span className="text-xs font-bold text-slate-700">USD / Tháng</span>
                    </div>
                  </div>
                </div>

                {/* Qualitative Improvement Effects */}
                <div className="lg:col-span-3 bg-white p-4 rounded-xl border border-slate-300 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-700 border-b pb-2 mb-3">
                      3. Lợi ích định tính (Qualitative)
                    </h4>
                    <p className="text-[11px] text-red-500 italic mb-2">
                      *Nếu không quy đổi được thành tiền thì ghi lợi ích định tính tại đây:
                    </p>
                    <textarea 
                      rows={3}
                      value={formData.qualitativeEffect}
                      onChange={e => handleInputChange('qualitativeEffect', e.target.value)}
                      placeholder="Ví dụ: Reduce risks 50% (Tăng độ an toàn khi vận hành máy)"
                      className="w-full border border-slate-300 rounded p-2 text-xs text-slate-800 font-medium"
                    />
                  </div>

                  <div className="bg-emerald-100 p-2 rounded text-[11px] text-emerald-900 font-medium">
                    Mức độ cải thiện an toàn: <span className="font-bold text-emerald-700">Giảm 50% rủi ro</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button 
                onClick={handleSaveKaizen}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 shadow"
              >
                <Save className="w-4 h-4" />
                <span>Nghiệm Thu & Lưu Báo Cáo</span>
              </button>
            </div>
          </div>
        )}


        {/* ----------------- TAB 3: DANH SÁCH / DATAVERSE VIEW ----------------- */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-400" />
                  Cơ Sở Dữ Liệu Kaizen (SharePoint List / Dataverse)
                </h2>
                <p className="text-xs text-slate-400">Tự động đồng bộ và lưu trữ tập trung, không sợ mất dữ liệu Excel</p>
              </div>

              <button 
                onClick={() => setActiveTab('idea')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Kaizen Mới</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
                  <tr>
                    <th className="p-3">Mã Kaizen</th>
                    <th className="p-3">Ngày</th>
                    <th className="p-3">Bộ phận</th>
                    <th className="p-3">Nội dung cải tiến</th>
                    <th className="p-3">Phân loại</th>
                    <th className="p-3">Người đề xuất</th>
                    <th className="p-3 text-right">Tiết kiệm ($)</th>
                    <th className="p-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {kaizenList.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-purple-700">{item.id}</td>
                      <td className="p-3 text-slate-600">{item.date}</td>
                      <td className="p-3 font-semibold">{item.dept}</td>
                      <td className="p-3 font-medium text-slate-900">{item.content || item.improvedContent}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {item.classification?.map(c => (
                            <span key={c} className="bg-slate-200 px-1.5 py-0.5 rounded font-bold text-[10px]">
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">{item.proposer}</td>
                      <td className="p-3 text-right font-bold text-emerald-700 font-mono">
                        ${(item.dailyHoursSaved * item.monthlyDays * item.hourlyCost).toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {/* ----------------- TAB 4: HƯỚNG DẪN CẤU HÌNH POWER APPS ----------------- */}
        {activeTab === 'docs' && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                <Code className="w-6 h-6 text-purple-700" />
                Hướng Dẫn Triển Khai Trên Microsoft Power Apps
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Các bước thiết lập ứng dụng Canvas App từ SharePoint List / Dataverse và các công thức Power Fx tính toán tự động.
              </p>
            </div>

            {/* Step 1: Database structure */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-bold text-sm text-slate-800 mb-2 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                1. Cấu trúc danh sách SharePoint List (`KaizenDatabase`)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono bg-white p-3 rounded border">
                <div>• Title (Single Line): Mã Kaizen</div>
                <div>• Date (Date Only): Ngày tạo</div>
                <div>• Dept (Choice): Bộ phận</div>
                <div>• Proposer (Person/Text): Đề xuất</div>
                <div>• Approved (Person/Text): Duyệt</div>
                <div>• Checked (Person/Text): Kiểm tra</div>
                <div>• ImprovedContent (Multiple Line)</div>
                <div>• Classification (Choice - Multi)</div>
                <div>• BeforeWH (Number): Giờ làm trước</div>
                <div>• AfterWH (Number): Giờ làm sau</div>
                <div>• DailyHoursSaved (Number)</div>
                <div>• HourlyRate (Number)</div>
              </div>
            </div>

            {/* Step 2: Power Fx Formulas */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                2. Các công thức Power Fx chính (Code mẫu cho Power Apps)
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-purple-800 block mb-1">a) Tự động tính Tổng tiết kiệm USD (`TextCostReduction.Text`):</span>
                  <pre className="bg-slate-900 text-emerald-400 p-3 rounded font-mono overflow-x-auto">
                    {`Text(
  Value(txtDailyHours.Text) * Value(txtMonthlyDays.Text) * Value(txtHourlyRate.Text),
  "$#,##0.00"
)`}
                  </pre>
                </div>

                <div>
                  <span className="font-bold text-purple-800 block mb-1">b) Nút Lưu dữ liệu (Patch Record vào SharePoint):</span>
                  <pre className="bg-slate-900 text-blue-300 p-3 rounded font-mono overflow-x-auto">
                    {`Patch(
  KaizenDatabase,
  Defaults(KaizenDatabase),
  {
    Title: txtKaizenID.Text,
    Date: dpDate.SelectedDate,
    Dept: drpDept.Selected.Value,
    Proposer: txtProposer.Text,
    ImprovedContent: txtContent.Text,
    BeforeWH: Value(txtBeforeWH.Text),
    AfterWH: Value(txtAfterWH.Text),
    TotalSavings: Value(txtDailyHours.Text) * Value(txtMonthlyDays.Text) * Value(txtHourlyRate.Text)
  }
);
Notify("Đã lưu Kaizen thành công!", NotificationType.Success);`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Step 3: Mobile & Camera feature */}
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-xs text-purple-900">
              <span className="font-bold block mb-1">💡 Lợi thế lớn nhất khi dùng Power Apps so với Excel:</span>
              <ul className="list-disc list-inside space-y-1 text-purple-800">
                <li>Công nhân / Kỹ sư có thể dùng **điện thoại hoặc máy tính bảng** mở Power Apps.</li>
                <li>Chụp ảnh trực tiếp từ camera điện thoại để đính kèm vào hình ảnh **Before** và **After** chỉ trong 3 giây.</li>
                <li>Không tốn thời gian chèn ảnh thủ công, căn chỉnh khung ô trong Excel.</li>
              </ul>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}