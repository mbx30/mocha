import { invoke } from '@tauri-apps/api/core'
import { DEFAULT_PRICE_BOOK, parsePriceBook, PRICE_BOOK_PREF_KEY, type PriceBook } from './priceBook'

export async function loadPriceBook(): Promise<PriceBook> {
  const raw = await invoke<string | null>('get_preference', { key: PRICE_BOOK_PREF_KEY })
  return parsePriceBook(raw ?? undefined)
}

export async function savePriceBook(book: PriceBook): Promise<void> {
  await invoke('set_preference', { key: PRICE_BOOK_PREF_KEY, value: JSON.stringify(book) })
}

export { DEFAULT_PRICE_BOOK, PRICE_BOOK_PREF_KEY }
