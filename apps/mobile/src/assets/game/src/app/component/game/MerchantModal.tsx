"use client";

import { InventoryItem, Player } from "@/shared/types/game";

type Props = {
  open: boolean;
  merchantName: string;
  stock: InventoryItem[];
  player: Player | undefined;
  onBuy: (item: InventoryItem) => void;
  onSell: (itemId: string) => void;
  onClose: () => void;
};

export default function MerchantModal({
  open,
  merchantName,
  stock,
  player,
  onBuy,
  onSell,
  onClose,
}: Props) {
  if (!open || !player) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-5xl bg-[#14081f] border-2 border-emerald-500 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-3xl font-fantasy text-emerald-200">{merchantName}</h2>
            <p className="text-emerald-300 font-rpg">Or du joueur : {player.gold}</p>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 border border-gray-500 text-white"
          >
            Fermer
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-fantasy text-violet-200 mb-3">Acheter</h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {stock.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-lg p-3 border ${
                    item.corrupted
                      ? "bg-red-950/40 border-red-700"
                      : "bg-[#1b0a3d]/80 border-violet-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-violet-100 font-bold">{item.name}</div>
                    <div className="text-yellow-300 font-bold">{item.buyPrice} or</div>
                  </div>
                  <div className="text-sm text-gray-300 mt-1">{item.description}</div>
                  {item.corrupted && (
                    <div className="mt-1">
                      <div className="text-xs text-red-300 font-bold">
                        Corrompu
                      </div>

                    </div>
                  )}
                  <button
                    onClick={() => onBuy(item)}
                    disabled={player.gold < (item.buyPrice || 0)}
                    className="mt-3 px-3 py-1 text-sm rounded bg-emerald-700 hover:bg-emerald-600 border border-emerald-400 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Acheter
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-fantasy text-violet-200 mb-3">Vendre</h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {player.inventory.length === 0 ? (
                <div className="text-gray-400 italic">Inventaire vide</div>
              ) : (
                player.inventory.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg p-3 border ${
                      item.corrupted
                        ? "bg-red-950/40 border-red-700"
                        : "bg-[#1b0a3d]/80 border-violet-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-violet-100 font-bold">
                        {item.name} <span className="text-xs text-violet-300">x{item.quantity}</span>
                      </div>
                      <div className="text-yellow-300 font-bold">{item.sellPrice || 0} or</div>
                    </div>
                    <div className="text-sm text-gray-300 mt-1">{item.description}</div>
                    {item.corrupted && (
                      <div className="mt-1">
                        <div className="text-xs text-red-300 font-bold">
                          Corrompu
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => onSell(item.id)}
                      className="mt-3 px-3 py-1 text-sm rounded bg-violet-700 hover:bg-violet-600 border border-violet-400 text-white"
                    >
                      Vendre
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}