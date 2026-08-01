"use client"

import { useEffect } from "react"
import { installFetchInterceptor } from "@/lib/fetch-interceptor"

export function FetchInterceptorInit() {
  useEffect(() => {
    installFetchInterceptor()
  }, [])

  return null
}