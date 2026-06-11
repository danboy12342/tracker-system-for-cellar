/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { NappyType } from './types';
import { Plus, Minus, PackagePlus, Trash2, PlusCircle, X, AlertTriangle, Download, Upload } from 'lucide-react';

export default function App() {
  const [inventory, setInventory] = useState<NappyType[]>(() => {
    try {
      const saved = localStorage.getItem('nappy-inventory');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load inventory:", e);
    }
    return [];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<NappyType | null>(null);

  // New Item State
  const [newName, setNewName] = useState('');
  const [newCount, setNewCount] = useState('0');
  const [newBoxQuantity, setNewBoxQuantity] = useState('30');
  const [newThreshold, setNewThreshold] = useState('10');

  useEffect(() => {
    localStorage.setItem('nappy-inventory', JSON.stringify(inventory));
  }, [inventory]);

  const updateCount = (id: string, delta: number) => {
    if ('vibrate' in navigator) {
      if (delta === 1) {
        navigator.vibrate(40); // Light tap for increment
      } else if (delta < 0) {
        navigator.vibrate([30, 50, 30]); // Double tap for decrement
      } else if (delta > 1) {
        navigator.vibrate(80); // Heavier tap for bulk add
      }
    }

    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const newCount = Math.max(0, item.count + delta);
        return { ...item, count: newCount };
      }
      return item;
    }));
  };

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: NappyType = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      count: parseInt(newCount) || 0,
      boxQuantity: parseInt(newBoxQuantity) || 30,
      minThreshold: parseInt(newThreshold) || 0,
    };

    setInventory([...inventory, newItem]);
    setIsAdding(false);
    
    // Reset form
    setNewName('');
    setNewCount('0');
    setNewBoxQuantity('30');
    setNewThreshold('10');
  };

  const handleDelete = () => {
    if (itemToDelete) {
      setInventory(prev => prev.filter(item => item.id !== itemToDelete.id));
      setItemToDelete(null);
    }
  };

  const handleExportCSV = () => {
    const header = "Name,Count,Box Quantity,Min Threshold\n";
    const rows = inventory.map(item => `"${item.name.replace(/"/g, '""')}",${item.count},${item.boxQuantity},${item.minThreshold}`).join("\n");
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + rows);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `nappy_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) return; // Only header or empty

      const newInventory = [...inventory];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        let parts = [];
        let current = '';
        let inQuotes = false;
        
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current);

        if (parts.length >= 4) {
          const name = parts[0].trim();
          const count = parseInt(parts[1], 10);
          const boxQuantity = parseInt(parts[2], 10);
          const minThreshold = parseInt(parts[3], 10);

          if (name && !isNaN(count)) {
            const existingIndex = newInventory.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
            if (existingIndex >= 0) {
              newInventory[existingIndex] = {
                ...newInventory[existingIndex],
                count,
                boxQuantity: !isNaN(boxQuantity) ? boxQuantity : newInventory[existingIndex].boxQuantity,
                minThreshold: !isNaN(minThreshold) ? minThreshold : newInventory[existingIndex].minThreshold,
              };
            } else {
              newInventory.push({
                id: crypto.randomUUID(),
                name,
                count,
                boxQuantity: !isNaN(boxQuantity) ? boxQuantity : 30,
                minThreshold: !isNaN(minThreshold) ? minThreshold : 10,
              });
            }
          }
        }
      }
      setInventory(newInventory);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalPacks = inventory.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex justify-center font-sans pb-32 select-none">
      <div className="w-full max-w-md flex flex-col relative bg-black shadow-2xl">
        
        <header className="pt-12 pb-4 px-6 bg-black border-b border-neutral-800">
          <div className="flex justify-between items-end mb-3">
            <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
            <div className="text-right">
              <div className="text-2xl font-black tabular-nums leading-none text-white">{totalPacks}</div>
              <div className="text-[10px] uppercase text-neutral-500 tracking-widest mt-1">Total Packs</div>
            </div>
          </div>
          <p className="text-neutral-400 text-sm">
            {inventory.length} Active Items •{' '}
            <span className={`${inventory.some(i => i.count <= i.minThreshold) ? 'text-amber-500 font-medium' : ''}`}>
              {inventory.filter(i => i.count <= i.minThreshold).length} Low Stock
            </span>
          </p>
        </header>

        <main className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
          {inventory.length === 0 && !isAdding && (
            <div className="p-4 flex-1 flex flex-col justify-center">
              <div className="text-center py-12 px-6 border-2 border-dashed border-neutral-800 rounded-3xl bg-neutral-950">
                <p className="text-neutral-500 mb-6 text-sm uppercase tracking-widest font-bold">No Items Tracked</p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="w-full h-16 bg-neutral-100 text-black font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 flex items-center justify-center gap-2 transition-transform"
                  >
                    + New Product
                  </button>
                  <label 
                    className="w-full h-16 bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white rounded-2xl shadow-lg flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors active:bg-neutral-800 cursor-pointer"
                  >
                    <Upload size={18} /> Import CSV
                    <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {inventory.map(item => {
            const isLow = item.count <= item.minThreshold;
            
            return (
              <div 
                key={item.id} 
                className={`rounded-3xl p-5 border-2 flex flex-col gap-4 transition-colors ${
                  isLow ? 'bg-amber-950/20 border-amber-600/50' : 'bg-neutral-900 border-neutral-800'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      {isLow && <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>}
                      <h2 className="font-bold text-lg leading-tight">{item.name}</h2>
                    </div>
                    {!isLow ? (
                      <p className="text-xs text-neutral-500 uppercase tracking-widest">
                        Box = {item.boxQuantity} Packs • Low: &le;{item.minThreshold}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-500/80 font-bold uppercase tracking-widest">
                        Low Stock (Min {item.minThreshold} PACKS)
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-4xl font-black tabular-nums leading-none ${isLow ? 'text-amber-500' : 'text-white'}`}>
                      {item.count}
                    </div>
                    <div className={`text-[10px] uppercase mt-1 ${isLow ? 'text-amber-500/60' : 'text-neutral-400'}`}>
                      Packs
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => updateCount(item.id, -1)}
                    className={`h-16 rounded-2xl flex items-center justify-center border font-bold touch-manipulation transition-colors ${
                      isLow 
                        ? 'bg-amber-900/30 border-amber-600/30 text-amber-500 active:bg-amber-900/50' 
                        : 'bg-neutral-800 border-neutral-700 active:bg-neutral-700'
                    }`}
                    disabled={item.count <= 0}
                  >
                    <Minus size={32} className={item.count <= 0 ? 'opacity-30' : ''} />
                  </button>
                  <button 
                    onClick={() => updateCount(item.id, 1)}
                    className={`h-16 rounded-2xl flex items-center justify-center touch-manipulation transition-colors ${
                      isLow 
                        ? 'bg-amber-500 text-black active:bg-amber-400' 
                        : 'bg-neutral-100 text-black active:bg-neutral-300'
                    }`}
                  >
                    <Plus size={32} />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => updateCount(item.id, item.boxQuantity)}
                    className="flex-1 h-12 bg-neutral-950 border border-neutral-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 touch-manipulation active:bg-neutral-800 transition-colors"
                  >
                    <PackagePlus size={18} />
                    ADD BOX ({item.boxQuantity} PACKS)
                  </button>
                  <button 
                    onClick={() => setItemToDelete(item)}
                    className="h-12 w-16 bg-neutral-950 border border-neutral-700 rounded-xl text-neutral-500 hover:text-red-400 active:bg-neutral-800 flex items-center justify-center transition-colors shrink-0"
                    aria-label="Delete item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}

          {inventory.length > 0 && (
            <div className="flex gap-3 mt-4 pt-4 border-t border-neutral-800/50">
              <button 
                onClick={handleExportCSV}
                className="flex-1 h-14 bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors active:bg-neutral-900 touch-manipulation"
              >
                <Download size={18} /> Export
              </button>
              <label 
                className="flex-1 h-14 bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition-colors active:bg-neutral-900 cursor-pointer touch-manipulation"
              >
                <Upload size={18} /> Import
                <input type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
              </label>
            </div>
          )}
        </main>

        {/* Global Add Button */}
        {inventory.length > 0 && !isAdding && (
          <div className="fixed bottom-0 left-0 right-0 p-6 pb-10 bg-black border-t border-neutral-800 flex justify-center z-40">
            <div className="w-full max-w-md flex gap-3">
              <button 
                onClick={() => setIsAdding(true)}
                className="flex-1 h-16 bg-neutral-100 text-black font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 transition-transform"
                aria-label="Add new item"
              >
                + New Product
              </button>
            </div>
          </div>
        )}

        {/* Add Modal */}
        {isAdding && (
           <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 transition-all">
             <div className="bg-[#0a0a0a] w-full max-w-md rounded-t-[48px] sm:rounded-3xl shadow-2xl border-t border-neutral-800 sm:border flex flex-col max-h-[90vh]">
               <div className="pt-10 pb-4 px-8 border-b border-neutral-800 flex justify-between items-center bg-black rounded-t-[48px] sm:rounded-t-3xl sticky top-0 z-10">
                 <h2 className="text-2xl font-bold tracking-tight text-white">Add Tracking</h2>
                 <button onClick={() => setIsAdding(false)} className="p-2 -mr-2 text-neutral-500 hover:text-white bg-neutral-900 rounded-full">
                   <X size={24} />
                 </button>
               </div>
               
               <form onSubmit={handleAddNew} className="p-8 flex-1 overflow-y-auto space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Product Name</label>
                    <input 
                      type="text" 
                      required
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="e.g. Tena Slip Maxi"
                      className="w-full h-16 bg-neutral-950 border border-neutral-800 rounded-2xl px-6 text-lg font-medium focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 outline-none transition-all placeholder-neutral-700"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Start Packs</label>
                      <input 
                        type="number" 
                        min="0"
                        required
                        value={newCount}
                        onChange={e => setNewCount(e.target.value)}
                        className="w-full h-16 bg-neutral-950 border border-neutral-800 rounded-2xl px-4 text-xl text-center focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Packs per Box</label>
                      <input 
                        type="number" 
                        min="1"
                        required
                        value={newBoxQuantity}
                        onChange={e => setNewBoxQuantity(e.target.value)}
                        className="w-full h-16 bg-neutral-900 border border-neutral-700 rounded-2xl px-4 text-xl text-center text-white focus:border-neutral-400 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-amber-500/80 mb-2">Low Stock (Packs)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-amber-500/50 font-bold">
                        &le;
                      </div>
                      <input 
                        type="number" 
                        min="0"
                        required
                        value={newThreshold}
                        onChange={e => setNewThreshold(e.target.value)}
                        className="w-full h-16 bg-amber-950/10 border border-amber-900/50 rounded-2xl pl-12 pr-6 text-xl text-amber-100 focus:border-amber-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      type="submit"
                      className="w-full h-16 bg-neutral-100 disabled:opacity-50 hover:bg-white text-black font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg active:scale-95 flex items-center justify-center transition-transform"
                      disabled={!newName.trim()}
                    >
                      Save Item
                    </button>
                  </div>
               </form>
             </div>
           </div>
        )}

        {/* Delete Confirmation Modal */}
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-[#0a0a0a] border border-neutral-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-bold tracking-tight text-white mb-2">Delete Item?</h3>
              <p className="text-neutral-400 mb-8 text-sm">
                Are you sure you want to completely remove <strong className="text-white">{itemToDelete.name}</strong> from tracking?
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 h-14 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-sm tracking-wide rounded-2xl"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 h-14 bg-red-950/40 border border-red-900/50 hover:bg-red-900/50 text-red-500 font-bold text-sm tracking-wide rounded-2xl transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
