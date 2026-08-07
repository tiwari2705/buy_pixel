'use client'

import type { LiveBlock } from '@/lib/blocks'
import { PixelGrid } from './PixelGrid'

/** Read-only wall used on the homepage. */
export function HomeWall({ blocks }: { blocks: LiveBlock[] }) {
	return <PixelGrid mode="read" blocks={blocks} />
}
