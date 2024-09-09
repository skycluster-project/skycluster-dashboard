import {DateTime, DurationUnit} from "luxon";
import { colors } from "@material-tailwind/react/types/generic";

export function getAge(date1: DateTime, date2: DateTime) {
    if (date1 == date2) {
        return "now"
    }

    interface ValMap {
        [key: string]: string;
    }

    const umap: ValMap = {
        "years": "yr",
        "months": "mo",
        "days": "d",
        "hours": "h",
        "minutes": "m",
        "seconds": "s",
        "milliseconds": "ms"
    }

    const units: DurationUnit[] = ["years", "months", "days", "hours", "minutes", "seconds", "milliseconds"];
    const diff = date1.diff(date2, units);

    for (const unit of units) {
        const val = Math.abs(diff.as(unit));
        if (val >= 1) {
            return Math.round(val) + umap[unit]
        }
    }

    return "n/a"
}

export function getAgeParse(date1: string, date2?: string): string {
    const dt1 = DateTime.fromISO(date1)
    const dt2 = date2 ? DateTime.fromISO(date2) : DateTime.now()
    return getAge(dt1, dt2)
}

declare global {
    interface Window {
        heap: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
}

export function sendStatsToHeap(name: string, prop: object) {
    if (window.heap!=undefined) {
        window.heap.track(name, prop);
    }
}

// The function returns a color based on the labels
// If the second label is not provided, it will be ignored
// Otherwise, a hash of concatenated labels will be used to determine the color
export function getColorFromLabel(first_label: string | undefined, second_label?: string | undefined): colors | undefined {
    const colors: colors[] = ["purple", "lime", "blue-gray", "gray", "light-blue", "brown", "deep-orange", "orange", "amber", "yellow", "light-green", "green", 
        "teal", "cyan", "blue", "indigo", "deep-purple", "pink", "red"];
    if (!first_label || typeof first_label !== 'string') return undefined;
  
    const label = second_label ? first_label.substring(0, 3) + second_label : first_label.substring(0, 3);

    // Get the first two letters of the label
    const key = label.toLowerCase();
  
    // Create a hash from the key
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash += key.charCodeAt(i);
    }
  
    // Map the hash to an index in the colors 
    // There are 19 colors currently
    const index = hash % colors.length;
  
    return colors[index];
  }