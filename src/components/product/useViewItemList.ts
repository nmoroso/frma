"use client";

import { useEffect, useRef } from "react";
import type { AnalyticsItem } from "@/lib/analytics/items";
import { track } from "@/lib/analytics/track";

/** Envía view_item_list una vez por combinación de lista + ítems visibles. */
export function useViewItemList(list: { id: string; name: string }, items: AnalyticsItem[] | null) {
  const sent = useRef<string>("");
  const signature = items ? `${list.id}:${items.map((i) => `${i.item_id}-${i.item_variant ?? ""}`).join(",")}` : "";
  useEffect(() => {
    if (!items || items.length === 0 || sent.current === signature) return;
    sent.current = signature;
    track("view_item_list", { item_list_id: list.id, item_list_name: list.name, items });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
}
