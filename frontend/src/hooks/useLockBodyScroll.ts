
import { useEffect } from "react"

let lockCount = 0
let previousOverflow = ""

export function useLockBodyScroll(isLocked: boolean) {
    useEffect(() => {
        if (!isLocked) {
            return
        }

        if (lockCount === 0) {
            previousOverflow = document.body.style.overflow
            document.body.style.overflow = "hidden"
        }

        lockCount += 1

        return () => {
            lockCount -= 1

            if (lockCount === 0) {
                document.body.style.overflow = previousOverflow
            }
        }
    }, [isLocked])
}