/**
 * components.js
 * Manages the dynamic injection of HTML components (like Modals) 
 * to keep index.html clean and modular.
 */

const AppComponents = {
    init: function() {
        this.injectModals();
    },

    injectModals: function() {
        const modalContainer = document.createElement('div');
        modalContainer.id = 'app-modals-container';
        
        modalContainer.innerHTML = `
            <div id="newQuotationModal" class="hidden fixed inset-0 bg-gray-50 z-[1002] flex flex-col h-full w-full">
                <header class="bg-white border-b border-gray-200 px-3 py-3 flex items-center justify-between sticky top-0 shadow-sm z-10">
                    <div class="flex items-center gap-3">
                        <button onclick="closeFSModal('newQuotationModal')" class="p-1.5 rounded-full hover:bg-gray-100">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        </button>
                        <h2 class="text-lg font-bold text-gray-900">New Quotation</h2>
                    </div>
                    <button onclick="clearQuotationForm()" class="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition border border-red-100">
                        Clear Draft
                    </button>
                </header>
                <div class="flex-1 overflow-y-auto p-4">
                    <div class="max-w-xl mx-auto">
                        <form id="quotationForm" class="space-y-4">
                            <div class="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
                                <h2 class="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                    Customer Details
                                </h2>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div class="relative">
                                        <input type="text" id="customerName" name="customerName" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="Customer Name" required autocomplete="off">
                                    </div>
                                    <input type="text" id="customerTIN" name="customerTIN" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="TIN (Optional)">
                                    <input type="text" id="customerAddress" name="customerAddress" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none sm:col-span-2" placeholder="Full Address" required>
                                    <input type="text" id="paymentTerms" name="paymentTerms" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none sm:col-span-2" placeholder="Terms of Payment (e.g. 50% DP, 50% upon completion)">
                                </div>
                            </div>
                            <div class="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
                                <h2 class="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                    Order Items
                                </h2>
                                <div id="lineItemsContainer" class="space-y-3 mb-3"></div>
                                <button type="button" class="w-full py-2.5 border-2 border-dashed border-indigo-200 text-indigo-600 bg-indigo-50 font-bold rounded-lg text-sm" onclick="addLineItem()">+ Add Item</button>
                            </div>
                            <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-md">
                                Generate Quote
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div id="pdfPreviewModal" class="hidden fixed inset-0 bg-black/90 backdrop-blur-sm z-[2000] flex flex-col">
                <div class="shrink-0 flex items-center justify-between px-3 py-2 bg-black/70 border-b border-white/10">
                    <div class="flex items-center gap-2 shrink-0">
                        <button onclick="closeFSModal('pdfPreviewModal')"
                            class="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-1.5 rounded text-xs shadow transition">
                            ✕ Close
                        </button>
                        <button id="pdfNavPrev" onclick="PDFNav.navigate(-1)" class="text-white hover:bg-white/20 p-1.5 rounded transition" title="Previous Quotation">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <span id="pdfNavCounter" class="text-white/60 text-xs font-bold min-w-[40px] text-center"></span>
                        <button id="pdfNavNext" onclick="PDFNav.navigate(1)" class="text-white hover:bg-white/20 p-1.5 rounded transition" title="Next Quotation">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                    </div>
                    
                    <div class="flex items-center gap-1">
                        <button onclick="let inp = document.getElementById('pdfZoomInput'); inp.value = Math.max(20, parseInt(inp.value) - 10); applyPDFZoom(inp.value);" class="text-white hover:bg-white/20 p-1.5 rounded transition" title="Zoom Out">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>
                        </button>
                        <div class="flex items-center bg-white/10 rounded px-1.5 py-0.5">
                            <input type="number" id="pdfZoomInput" min="20" max="200" value="100" 
                                class="w-10 bg-transparent text-white text-xs font-bold text-center outline-none" 
                                onchange="applyPDFZoom(this.value)">
                            <span class="text-white text-xs font-bold pr-1">%</span>
                        </div>
                        <button onclick="let inp = document.getElementById('pdfZoomInput'); inp.value = Math.min(200, parseInt(inp.value) + 10); applyPDFZoom(inp.value);" class="text-white hover:bg-white/20 p-1.5 rounded transition" title="Zoom In">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                    </div>

                    <div class="flex items-center gap-2">
                        <button onclick="fitPDFToScreen()"
                            class="shrink-0 bg-white/20 hover:bg-white/30 text-white p-1.5 rounded transition border border-white/10" title="Fit to Page">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                        </button>
                        <button onclick="downloadPDF(window._currentPreviewQNum)"
                            class="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded shadow transition" title="Download PDF">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        </button>
                    </div>
                </div>
                <div id="pdfPreviewViewport" class="flex-1 overflow-auto flex items-start justify-start p-0 sm:p-4">
                    <div id="pdfScaleWrapper" style="transform-origin: top left; transition: transform 0.1s ease; will-change: transform;">
                        <div id="quotation-document" style="background-color: white; width: 8.5in; height: 10.6in; padding: 0.3in 0.4in; box-sizing: border-box; color: #000; font-size: 12px; display: flex; flex-direction: column; overflow: hidden; position: relative;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                <div style="display: flex; gap: 15px; height: 95px;">
                                    <img id="pdf-logo-1" src="" style="height: 100%; width: auto; object-fit: contain;" alt="Logo 1">
                                    <div style="display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                                        <img id="pdf-logo-2" src="" style="height: 52px; width: auto; object-fit: contain; align-self: flex-start;" alt="Logo 2">
                                        <div style="font-size: 11px; line-height: 1.2;">
                                            <strong>Operated by: Generoso T. Calacday Jr.</strong><br>
                                            Karuhatan Valenzuela City<br>
                                            www.etchsignage.com
                                        </div>
                                    </div>
                                </div>
                                <h1 style="font-size: 26px; font-weight: bold; color: #194447; margin: 0; text-transform: uppercase;">Quotation</h1>
                            </div>
                            <div style="display: flex; justify-content: space-between; border: 0.5pt solid #000; padding: 8px; margin-bottom: 10px;">
                                <div style="width: 55%;">
                                    <strong>FOR:</strong><br><br>
                                    <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                                        <tr><td style="width: 110px; font-weight: bold; padding: 12px 4px; vertical-align: top;">Registered Name</td><td style="width: 10px; padding: 12px 4px; vertical-align: top;">:</td><td style="padding: 12px 4px; vertical-align: top;"><span id="pdf-reg-name"></span></td></tr>
                                        <tr><td style="width: 110px; font-weight: bold; padding: 12px 4px; vertical-align: top;">TIN</td><td style="width: 10px; padding: 12px 4px; vertical-align: top;">:</td><td style="padding: 12px 4px; vertical-align: top;"><span id="pdf-tin"></span></td></tr>
                                        <tr><td style="width: 110px; font-weight: bold; padding: 12px 4px; vertical-align: top;">Business Address</td><td style="width: 10px; padding: 12px 4px; vertical-align: top;">:</td><td style="padding: 12px 4px; vertical-align: top;"><span id="pdf-bus-address"></span></td></tr>
                                    </table>
                                </div>
                                <div style="width: 40%;">
                                    <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                                        <tr><td style="width: 90px; font-weight: bold; padding: 12px 4px; vertical-align: top;">Date</td><td style="width: 10px; padding: 12px 4px; vertical-align: top;">:</td><td style="text-align: right; padding: 12px 4px; vertical-align: top;"><span id="pdf-q-date"></span></td></tr>
                                        <tr><td style="width: 90px; font-weight: bold; padding: 12px 4px; vertical-align: top;">Quote No.</td><td style="width: 10px; padding: 12px 4px; vertical-align: top;">:</td><td style="text-align: right; padding: 12px 4px; vertical-align: top;"><span id="pdf-q-no"></span></td></tr>
                                        <tr><td style="width: 90px; font-weight: bold; padding: 12px 4px; vertical-align: top;">Valid Until</td><td style="width: 10px; padding: 12px 4px; vertical-align: top;">:</td><td style="text-align: right; padding: 12px 4px; vertical-align: top;"><span id="pdf-q-valid"></span></td></tr>
                                        <tr><td style="width: 90px; font-weight: bold; padding: 12px 4px; vertical-align: top;">Terms of Payment</td><td style="width: 10px; padding: 12px 4px; vertical-align: top;">:</td><td style="text-align: right; padding: 12px 4px; vertical-align: top;"><span id="pdf-payment-terms"></span></td></tr>
                                    </table>
                                </div>
                            </div>
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 5px; table-layout: fixed; empty-cells: show;">
                                <thead>
                                    <tr>
                                        <th style="width: 50%; border: 0.5pt solid #000; padding: 4px 12px; text-align: center; font-weight: bold; background-color: #e0e0e0;">Item Description/Nature of Service</th>
                                        <th style="width: 12%; border: 0.5pt solid #000; padding: 4px 12px; text-align: center; font-weight: bold; background-color: #e0e0e0;">Quantity</th>
                                        <th style="width: 19%; border: 0.5pt solid #000; padding: 4px 12px; text-align: center; font-weight: bold; background-color: #e0e0e0;">Unit Cost/Price</th>
                                        <th style="width: 19%; border: 0.5pt solid #000; padding: 4px 12px; text-align: center; font-weight: bold; background-color: #e0e0e0;">Amount</th>
                                    </tr>
                                </thead>
                                <tbody id="pdf-table-body"></tbody>
                            </table>
                            <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 10px; margin-top: 5px;">
                                <div style="color: red; font-weight: bold; font-size: 14px; margin: 0; flex-grow: 1; text-align: center; padding-right: 15px;">"THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAX"</div>
                                <div style="display: flex; width: 250px; border: 0.5pt solid #000; padding: 4px 12px 4px 5px; font-weight: bold; font-size: 14px; box-sizing: border-box;">
                                    <div style="flex-grow: 1; text-align: left;">TOTAL AMOUNT</div>
                                    <div id="pdf-total-amt" style="text-align: right;"></div>
                                </div>
                            </div>
                            <div style="margin-top: auto; display: flex; flex-direction: column;">
                                <div style="display: flex; justify-content: space-between; font-size: 11px; line-height: 1.3; margin-bottom: 5px;">
                                    <div style="width: 48%;"><strong>Payment:</strong><br>Cheques: Generoso T. Calacday Jr.<br>Bank Transfer: BDO, Maya Bank, Maribank<br>Cash Payment</div>
                                    <div style="width: 48%;"><strong>Terms & Conditions:</strong><br>This document is an estimate for the project and is not a valid invoice.<br>Prices indicated herein are subject to negotiation. The final agreed pricing will be formally presented and confirmed in the Purchase Order.</div>
                                </div>
                                <div style="display: flex; justify-content: space-between;">
                                    <div style="width: 48%; position: relative; margin-top: 15px;">
                                        Accepted by:
                                        <div style="text-align: center;">
                                            <img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" style="visibility: hidden; height: 75px; width: auto; margin-bottom: -45px; position: relative; z-index: 10; display: inline-block;">
                                            <div style="position: relative; z-index: 1; text-align: center; margin-top: 15px; margin-bottom: 2px; color: transparent;">.</div>
                                            <div style="position: relative; z-index: 1; border-top: 0.5pt solid #000; text-align: center; padding-top: 3px; font-size: 11px;">Client Signature / Date</div>
                                        </div>
                                    </div>
                                    <div style="width: 48%; position: relative; margin-top: 15px;">
                                        Prepared by:
                                        <div style="text-align: center;">
                                            <img id="pdf-prep-sig" src="" alt="Signature" style="visibility: hidden; height: 75px; width: auto; object-fit: contain; margin-bottom: -45px; top: -10px; position: relative; z-index: 10; display: inline-block;">
                                            <div style="position: relative; z-index: 1; text-align: center; margin-top: 15px; margin-bottom: 2px;">
                                                <span id="pdf-prep-by" style="font-weight: bold;"></span> / <span id="pdf-prep-phone"></span>
                                            </div>
                                            <div style="position: relative; z-index: 1; border-top: 0.5pt solid #000; text-align: center; padding-top: 3px; font-size: 11px; color: transparent;">.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="newProjectModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <header class="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                        <h2 class="text-base font-bold text-gray-900">Create New Project</h2>
                        <button onclick="closeFSModal('newProjectModal')" class="text-gray-400"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </header>
                    <form id="newProjectForm" class="p-4 space-y-3">
                        <div><label class="block text-xs font-bold text-gray-700 mb-1">Project Name</label><input type="text" id="newProjName" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" required></div>
                        <div id="newProjAgentContainer" class="hidden"><label class="block text-xs font-bold text-gray-700 mb-1">Main Agent</label><select id="newProjMainAgent" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"></select></div>
                        <div><label class="block text-xs font-bold text-gray-700 mb-1">Co Agent (Optional)</label><select id="newProjCoAgent" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"><option value="">None (1 Agent Only)</option></select></div>
                        <div class="flex gap-2 pt-2">
                            <button type="button" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg transition text-sm" onclick="closeFSModal('newProjectModal')">Cancel</button>
                            <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition shadow-md text-sm">Deploy</button>
                        </div>
                    </form>
                </div>
            </div>

            <div id="fixedCostListModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                    <header class="bg-orange-50 border-b border-orange-100 px-4 py-3 flex items-center justify-between sticky top-0">
                        <h2 class="text-base font-bold text-orange-800 flex items-center gap-2"><svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg> Global Fixed Costs</h2>
                        <div class="flex items-center gap-3">
                            <button onclick="openFSModal('fixedCostModal')" class="bg-orange-600 text-white hover:bg-orange-700 font-bold py-1.5 px-3 rounded-lg text-xs transition shadow-sm">+ Add Cost</button>
                            <button onclick="closeFSModal('fixedCostListModal')" class="text-orange-400 hover:text-orange-600 transition"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                        </div>
                    </header>
                    <div class="overflow-y-auto flex-1 p-4">
                        <table class="w-full text-left border-collapse text-sm">
                            <thead><tr class="border-b border-gray-200 text-gray-500 uppercase text-xs"><th class="px-2 py-2">Date</th><th class="px-2 py-2 w-1/2">Description</th><th class="px-2 py-2 text-right">Amount</th></tr></thead>
                            <tbody id="fixedCostsBody" class="divide-y divide-gray-100 text-gray-700"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="fixedCostModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1002] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <header class="bg-orange-50 border-b border-orange-100 px-4 py-3 flex items-center justify-between">
                        <h2 class="text-base font-bold text-orange-800">Add Fixed Cost</h2>
                        <button onclick="closeFSModal('fixedCostModal')" class="text-orange-400"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </header>
                    <form id="fixedCostForm" class="p-4 space-y-3">
                        <input type="date" id="fcDate" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" required>
                        <input type="text" id="fcDesc" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="Description (e.g. Shop Rent)" required>
                        <input type="number" id="fcAmt" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none font-bold" placeholder="Amount (PHP)" step="0.01" required>
                        <div class="flex gap-2 pt-2">
                            <button type="button" class="flex-1 bg-gray-100 font-bold py-2 rounded-lg text-sm" onclick="closeFSModal('fixedCostModal')">Cancel</button>
                            <button type="submit" id="fcSubmitBtn" class="flex-1 bg-orange-600 text-white font-bold py-2 rounded-lg text-sm">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <div id="updateProfileModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <header class="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                        <h2 class="font-bold text-gray-900">Update Profile</h2>
                        <button onclick="closeFSModal('updateProfileModal')"><svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </header>
                    <form id="updateProfileForm" class="p-4 space-y-3">
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Username</label>
                            <input type="text" id="updUsername" class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" required placeholder="Username">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Display Name</label>
                            <input type="text" id="updDisplayName" class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Display Name">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Email</label>
                            <input type="email" id="updEmail" class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" required placeholder="Email">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Contact</label>
                            <input type="text" id="updContact" class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" required placeholder="Contact">
                        </div>
                        <div class="pt-1">
                            <label class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Password to Confirm</label>
                            <input type="password" id="updPassConfirm" class="w-full px-3 py-2 border border-indigo-100 bg-indigo-50 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" required placeholder="Enter your password">
                        </div>
                        <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg shadow-sm transition">Save Changes</button>
                    </form>
                </div>
            </div>

            <div id="uploadSigModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <header class="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between"><h2 class="font-bold text-gray-900">Upload Signature</h2><button onclick="closeFSModal('uploadSigModal')"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button></header>
                    <form id="uploadSigForm" class="p-4 space-y-3 text-center">
                        <svg class="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        <input type="file" id="sigFile" accept="image/*" required class="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-gray-100">
                        <input type="password" id="sigPass" class="w-full px-3 py-2 border rounded-lg" placeholder="Password" required>
                        <button type="submit" class="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg">Upload</button>
                    </form>
                </div>
            </div>

            <div id="uploadAvatarModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <header class="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                        <h2 class="font-bold text-gray-900">Profile Photo</h2>
                        <button onclick="closeFSModal('uploadAvatarModal')"><svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </header>
                    <form id="uploadAvatarForm" class="p-4 space-y-4">
                        <div class="flex flex-col items-center gap-3">
                            <div class="relative w-24 h-24 rounded-full border-2 border-indigo-100 bg-gray-50 overflow-hidden flex items-center justify-center">
                                <img id="avatarPreviewImg" src="" class="hidden w-full h-full object-cover">
                                <div id="avatarPreviewPlaceholder" class="flex flex-col items-center text-gray-300">
                                    <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                </div>
                            </div>
                            <label class="cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-4 py-2 rounded-lg border border-indigo-200 transition">
                                Choose Photo
                                <input type="file" id="avatarFile" accept="image/*" required class="hidden">
                            </label>
                        </div>
                        <input type="password" id="avatarPass" class="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Password to confirm" required>
                        <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg transition shadow-sm">Upload Photo</button>
                    </form>
                </div>
            </div>

            <div id="updatePasswordModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <header class="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between"><h2 class="font-bold text-gray-900">Change Password</h2><button onclick="closeFSModal('updatePasswordModal')"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></header>
                    <form id="updatePasswordForm" class="p-4 space-y-3">
                        <input type="password" id="updOldPass" class="w-full px-3 py-2 border rounded-lg" placeholder="Current Password" required>
                        <input type="password" id="updNewPass" class="w-full px-3 py-2 border rounded-lg" placeholder="New Password" required>
                        <button type="submit" class="w-full bg-gray-800 text-white font-bold py-2 rounded-lg">Update</button>
                    </form>
                </div>
            </div>

            <div id="uploadLogosModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <header class="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                        <h2 class="font-bold text-gray-900">Manage Company Logos</h2>
                        <button onclick="closeFSModal('uploadLogosModal')"><svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </header>
                    <div class="p-4 space-y-5">
                        <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
                            <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Logo 1 <span class="text-gray-400 font-normal normal-case">(Main / Square)</span></p>
                            <div class="flex items-center gap-3 mb-3"><img id="logoPreview1" src="" alt="Logo 1" class="w-14 h-14 object-contain rounded-lg border border-gray-200 bg-white p-1"><span class="text-xs text-gray-400">Current logo preview</span></div>
                            <form id="uploadLogo1Form" class="space-y-2">
                                <input type="file" id="logo1File" accept="image/*" required class="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-bold">
                                <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-sm transition">Upload Logo 1</button>
                            </form>
                        </div>
                        <div class="bg-gray-50 border border-gray-200 rounded-xl p-3">
                            <p class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Logo 2 <span class="text-gray-400 font-normal normal-case">(Secondary / Wide)</span></p>
                            <div class="flex items-center gap-3 mb-3"><img id="logoPreview2" src="" alt="Logo 2" class="w-14 h-14 object-contain rounded-lg border border-gray-200 bg-white p-1"><span class="text-xs text-gray-400">Current logo preview</span></div>
                            <form id="uploadLogo2Form" class="space-y-2">
                                <input type="file" id="logo2File" accept="image/*" required class="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-bold">
                                <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-sm transition">Upload Logo 2</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            <div id="pdfModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1050] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl p-6 w-full max-w-xs text-center shadow-2xl">
                    <svg class="w-12 h-12 text-emerald-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <h2 id="modalTitle" class="text-lg font-black text-gray-800 mb-1">Success!</h2>
                    <p id="modalBody" class="text-gray-500 text-xs mb-4">Document saved to Database.</p>
                    <div id="postGenActions" class="hidden">
                        <button class="w-full bg-gray-100 font-bold py-2 rounded-lg text-sm" onclick="closeFSModal('pdfModal'); navigateTo('/quotations');">View in My Quotations</button>
                    </div>
                </div>
            </div>

            <div id="deleteModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl p-6 w-full max-w-xs text-center shadow-2xl">
                    <svg class="w-10 h-10 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    <h2 class="text-base font-black text-red-600 mb-1">Delete?</h2>
                    <form id="deleteForm" class="space-y-3 mt-2">
                        <input type="password" id="delPass" class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Password" required>
                        <input type="hidden" id="delQNum">
                        <button type="submit" class="w-full bg-red-600 text-white font-bold py-2 rounded-lg text-sm">Confirm</button>
                    </form>
                    <button class="w-full mt-2 bg-gray-100 text-gray-700 font-bold py-2 rounded-lg text-sm" onclick="closeFSModal('deleteModal')">Cancel</button>
                </div>
            </div>

            <div id="recordModal" class="hidden fixed inset-0 bg-gray-50 z-[1002] flex flex-col h-full w-full">
                <header class="bg-white border-b border-gray-200 px-3 py-3 flex items-center gap-3 sticky top-0 shadow-sm z-10">
                    <button onclick="_closeRecordModal()" class="p-1.5 rounded-full hover:bg-gray-100"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg></button>
                    <h2 class="text-lg font-bold text-gray-900">Submit Record</h2>
                </header>
                <div class="flex-1 overflow-y-auto p-4">
                    <div class="max-w-xl mx-auto">
                        <p id="recProjName" class="text-sm font-bold text-indigo-600 mb-4 truncate bg-indigo-50 p-2.5 rounded-lg border border-indigo-100"></p>
                        <form id="recordForm" class="space-y-3.5">
                            <div id="recAgentContainer" class="hidden">
                                <label class="block text-xs font-bold mb-1 text-gray-600">Record Owner:</label>
                                <select id="recAgent" class="w-full px-3 py-2 bg-white border rounded-lg font-bold text-sm"></select>
                            </div>
                            <select id="recAgent" class="hidden"></select>
                            <div id="recordEntriesContainer" class="space-y-4"></div>
                            <button type="button" onclick="addRecordEntry()" class="w-full py-2.5 border-2 border-dashed border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-bold rounded-xl text-sm transition flex items-center justify-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                                Add Another Entry
                            </button>
                            <button type="submit" id="recSubmitBtn" class="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg mt-2 text-sm shadow-md hover:bg-indigo-700 transition">Save Records</button>
                        </form>
                    </div>
                </div>
            </div>

            <div id="subLedgerModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[1005] flex items-center justify-center p-3">
                <div class="bg-white rounded-xl p-5 w-full max-w-sm shadow-2xl flex flex-col max-h-[80vh]">
                    <h2 id="subLedgerTitle" class="text-lg font-bold text-gray-900">Details</h2>
                    <p id="subLedgerSubtitle" class="text-xs text-gray-500 mb-3"></p>
                    <div class="flex-1 overflow-y-auto bg-gray-50 rounded-lg border mb-4">
                        <table class="w-full text-left border-collapse text-xs">
                            <thead class="border-b text-gray-500 uppercase"><tr><th class="px-2 py-2">Date</th><th class="px-2 py-2 w-1/2">Desc</th><th class="px-2 py-2 text-right">Amt</th></tr></thead>
                            <tbody id="subLedgerBody" class="divide-y divide-gray-200"></tbody>
                        </table>
                    </div>
                    <button class="w-full bg-gray-100 font-bold py-2 rounded-lg text-sm" onclick="closeFSModal('subLedgerModal')">Back</button>
                </div>
            </div>

            <div id="imageModal" class="hidden fixed inset-0 bg-black/90 backdrop-blur-md z-[1020] flex flex-col items-center justify-center p-4">
                <img id="modalImageSrc" src="" class="max-w-full max-h-[75vh] rounded shadow-2xl object-contain mb-4">
                <button class="bg-white/20 text-white font-bold py-2 px-6 rounded-full border border-white/30 text-sm" onclick="closeFSModal('imageModal')">Close</button>
            </div>

            <div id="editQuotationModal" class="hidden fixed inset-0 bg-gray-50 z-[1002] flex flex-col h-full w-full">
                <header class="bg-white border-b border-gray-200 px-3 py-3 flex items-center justify-between sticky top-0 shadow-sm z-10">
                    <div class="flex items-center gap-3">
                        <button onclick="closeFSModal('editQuotationModal')" class="p-1.5 rounded-full hover:bg-gray-100">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        </button>
                        <h2 class="text-lg font-bold text-gray-900">Edit Quotation</h2>
                    </div>
                </header>
                <div class="flex-1 overflow-y-auto p-4">
                    <div class="max-w-xl mx-auto">
                        <form id="editQuotationForm" class="space-y-4">
                            <input type="hidden" id="editQNumber">
                            <div class="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
                                <h2 class="text-base font-bold text-gray-800 mb-3">Customer Details</h2>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div class="relative">
                                        <input type="text" id="editCustomerName" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="Customer Name" required autocomplete="off">
                                    </div>
                                    <input type="text" id="editCustomerTIN" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="TIN (Optional)">
                                    <input type="text" id="editCustomerAddress" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none sm:col-span-2" placeholder="Full Address" required>
                                    <input type="text" id="editPaymentTerms" class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none sm:col-span-2" placeholder="Terms of Payment (e.g. 50% DP, 50% upon completion)">
                                </div>
                            </div>
                            <div class="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-gray-200">
                                <h2 class="text-base font-bold text-gray-800 mb-3">Order Items</h2>
                                <div id="editLineItemsContainer" class="space-y-3 mb-3"></div>
                                <button type="button" class="w-full py-2.5 border-2 border-dashed border-amber-200 text-amber-600 bg-amber-50 font-bold rounded-lg text-sm" onclick="addEditLineItem()">+ Add Item</button>
                            </div>
                            <button type="submit" class="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-md">
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <div id="grossRevModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                    <header class="bg-emerald-50 border-b border-emerald-100 px-4 py-3 flex items-center justify-between sticky top-0">
                        <h2 class="text-base font-bold text-emerald-800 flex items-center gap-2">
                            <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Gross Revenue Breakdown
                        </h2>
                        <button onclick="closeFSModal('grossRevModal')" class="text-emerald-400 hover:text-emerald-600 transition"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </header>
                    <div class="overflow-y-auto flex-1 p-4">
                        <table class="w-full text-left border-collapse text-sm">
                            <thead><tr class="border-b border-gray-200 text-gray-500 uppercase text-xs"><th class="px-2 py-2 w-1/2">Project</th><th class="px-2 py-2 text-right">Sales</th></tr></thead>
                            <tbody id="grossRevBody" class="divide-y divide-gray-100 text-gray-700"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="projExpModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1001] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                    <header class="bg-red-50 border-b border-red-100 px-4 py-3 flex items-center justify-between sticky top-0">
                        <h2 class="text-base font-bold text-red-800 flex items-center gap-2">
                            <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            Project Expenses Breakdown
                        </h2>
                        <button onclick="closeFSModal('projExpModal')" class="text-red-400 hover:text-red-600 transition"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </header>
                    <div class="overflow-y-auto flex-1 p-4">
                        <table class="w-full text-left border-collapse text-sm">
                            <thead><tr class="border-b border-gray-200 text-gray-500 uppercase text-xs"><th class="px-2 py-2 w-2/5">Project</th><th class="px-2 py-2 text-right">Expenses</th><th class="px-2 py-2 text-right">Shares</th><th class="px-2 py-2 text-right">Tax (8%)</th><th class="px-2 py-2 text-right">Total</th></tr></thead>
                            <tbody id="projExpBody" class="divide-y divide-gray-100 text-gray-700"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ==========================================
                 CUSTOMER MANAGEMENT MODALS
                 ========================================== -->

            <!-- Manage Customers (full-screen list) -->
            <div id="manageCustomersModal" class="hidden fixed inset-0 bg-gray-50 z-[1002] flex flex-col h-full w-full">
                <header class="bg-white border-b border-gray-200 px-3 py-3 flex items-center justify-between sticky top-0 shadow-sm z-10">
                    <div class="flex items-center gap-3">
                        <button onclick="closeFSModal('manageCustomersModal')" class="p-1.5 rounded-full hover:bg-gray-100">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        </button>
                        <h2 class="text-lg font-bold text-gray-900">Customer Database</h2>
                    </div>
                    <button onclick="CustomerManager.openAddCustomerModal()"
                        class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
                        Add New
                    </button>
                </header>
                <div class="p-3 bg-white border-b border-gray-100">
                    <div class="relative max-w-lg mx-auto">
                        <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <input type="text" id="customerManageSearch" class="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search by name or address...">
                    </div>
                </div>
                <div class="flex-1 overflow-y-auto">
                    <div class="max-w-2xl mx-auto w-full">
                        <table class="w-full text-left border-collapse text-sm">
                            <thead class="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                                <tr class="text-gray-500 uppercase text-xs">
                                    <th class="px-3 py-2.5">Customer</th>
                                    <th class="px-3 py-2.5">TIN</th>
                                    <th class="px-3 py-2.5 text-right w-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="customerManageBody" class="divide-y divide-gray-100 text-gray-700"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Add / Edit Customer (small modal) -->
            <div id="saveCustomerModal" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[1003] flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <header class="bg-gray-50 border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                        <h2 id="custModalTitle" class="font-bold text-gray-900">Add Customer</h2>
                        <button onclick="closeFSModal('saveCustomerModal')">
                            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </header>
                    <form id="saveCustomerForm" class="p-4 space-y-3">
                        <input type="hidden" id="custSaveId">
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Name <span class="text-red-400">*</span></label>
                            <input type="text" id="custSaveName" class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Customer / Company Name" required>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">TIN</label>
                            <input type="text" id="custSaveTIN" class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="TIN (Optional)">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Address <span class="text-red-400">*</span></label>
                            <input type="text" id="custSaveAddress" class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Full Address" required>
                        </div>
                        <div class="flex gap-2 pt-1">
                            <button type="button" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg text-sm transition" onclick="closeFSModal('saveCustomerModal')">Cancel</button>
                            <button type="submit" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-sm transition shadow-md">Save</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modalContainer);
    }
};

// Initialize immediately upon script execution to ensure DOM nodes are ready for other scripts
AppComponents.init();
