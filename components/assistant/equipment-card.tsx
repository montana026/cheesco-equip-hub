"use client";

import Link from "next/link";
import { fmtNgnFull } from "@/lib/format";

export interface EquipmentCardData {
  id: string;
  slug: string;
  name: string;
  brand?: string;
  model?: string;
  year?: number;
  category?: string;
  condition?: string;
  location?: string;
  listingType?: string;
  dailyRateNgn?: number | null;
  salePriceNgn?: number | null;
  isOperatorIncluded?: boolean;
  isDeliveryAvailable?: boolean;
  availabilityStatus?: string;
  isVerified?: boolean;
  imageUrl?: string;
}

interface EquipmentCardProps {
  item: EquipmentCardData;
  isDark?: boolean;
}

export function AssistantEquipmentCard({ item, isDark = false }: EquipmentCardProps) {
  const isRent = item.listingType === "FOR_RENT" || item.listingType === "FOR_SALE_AND_RENT";
  const isSale = item.listingType === "FOR_SALE" || item.listingType === "FOR_SALE_AND_RENT";

  const conditionLabel = item.condition ? item.condition.replace(/_/g, " ") : "Verified Machinery";

  return (
    <div
      className={`group rounded-xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md flex flex-col ${
        isDark
          ? "bg-[#162636] border-[#243B52] text-[#F8FAFC]"
          : "bg-white border-[#DCE3EA] text-[#334155]"
      }`}
    >
      {/* Top Banner Image with Badges */}
      <div className="relative h-32 w-full overflow-hidden bg-zinc-800">
        <img
          src={item.imageUrl || "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=70"}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=70";
          }}
        />

        {/* Verified Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-[#07131E]/90 backdrop-blur-sm border border-[#FACC15]/30 text-[#FACC15] px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide">
          <svg className="w-3 h-3 text-[#FACC15]" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Cheesco Verified
        </div>

        {/* Condition tag */}
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-zinc-200 text-[10px] font-medium px-2 py-0.5 rounded">
          {conditionLabel}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#FACC15]">
              {item.brand || item.category || "Heavy Machinery"}
            </span>
            {item.year ? (
              <span className={`text-[10px] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
                {item.year}
              </span>
            ) : null}
          </div>

          <h4 className="font-bold text-xs sm:text-sm line-clamp-1 mt-0.5 tracking-tight">
            {item.name}
          </h4>

          {item.location && (
            <div className={`flex items-center gap-1 text-[11px] mt-1 ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{item.location}</span>
            </div>
          )}
        </div>

        {/* Price & Features */}
        <div className="pt-2 border-t border-dashed border-current/10">
          <div className="flex items-baseline justify-between mb-2">
            <span className={`text-[10px] uppercase font-semibold tracking-wider ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
              {isRent && item.dailyRateNgn ? "Rental Rate" : "Asking Price"}
            </span>
            <div className="text-right">
              {isRent && item.dailyRateNgn ? (
                <div className="text-xs sm:text-sm font-extrabold text-[#FACC15]">
                  ₦{fmtNgnFull(item.dailyRateNgn)}
                  <span className={`text-[10px] font-normal ${isDark ? "text-zinc-300" : "text-zinc-600"}`}>
                    {" "}/ day
                  </span>
                </div>
              ) : isSale && item.salePriceNgn ? (
                <div className="text-xs sm:text-sm font-extrabold text-emerald-400">
                  ₦{fmtNgnFull(item.salePriceNgn)}
                </div>
              ) : (
                <span className="text-xs text-zinc-400 font-medium">Contact for rate</span>
              )}
            </div>
          </div>

          {/* Action Link */}
          <Link
            href={`/equipment/${item.slug}`}
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all bg-[#FACC15] text-[#07131E] hover:bg-[#EAB308] active:scale-[0.98] shadow-sm"
          >
            <span>View Details</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
