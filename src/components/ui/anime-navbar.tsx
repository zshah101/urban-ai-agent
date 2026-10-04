"use client"

import React, { useState, useSyncExternalStore } from "react"
import { motion, AnimatePresence } from "motion/react"
import Link from "next/link"
import { LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
  onSpecialClick?: () => void
}

interface NavBarProps {
  items: NavItem[]
  className?: string
  defaultActive?: string
}

const subscribeMounted = () => () => {};
const mountedSnapshot = () => true;
const serverSnapshot = () => false;

export function AnimeNavBar({ items, className, defaultActive = "Home" }: NavBarProps) {
  const mounted = useSyncExternalStore(subscribeMounted, mountedSnapshot, serverSnapshot)
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>(defaultActive)

  if (!mounted) return null

  return (
    <div className={cn("fixed top-5 left-0 right-0 z-[9999]", className)}>
      <div className="flex justify-center pt-6">
        <motion.div
          className="flex items-center gap-1 bg-black/60 border border-amber-900/30 backdrop-blur-lg py-2 px-2 rounded-full shadow-lg shadow-amber-950/20 relative"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.name
            const isHovered = hoveredTab === item.name

            return (
              <Link
                key={item.name}
                href={item.url}
                onClick={(e) => {
                  if (item.onSpecialClick) {
                    e.preventDefault()
                    item.onSpecialClick()
                    return
                  }
                  setActiveTab(item.name)
                  if (item.url.startsWith('#')) {
                    e.preventDefault()
                    const id = item.url.slice(1)
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                onMouseEnter={() => setHoveredTab(item.name)}
                onMouseLeave={() => setHoveredTab(null)}
                className={cn(
                  "relative cursor-pointer text-sm font-mono font-semibold px-5 py-2.5 rounded-full transition-all duration-300",
                  "text-white/50 hover:text-white/90",
                  isActive && "text-amber-400"
                )}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full -z-10 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: [0.3, 0.5, 0.3],
                      scale: [1, 1.03, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-md" />
                    <div className="absolute inset-[-4px] bg-amber-500/10 rounded-full blur-xl" />
                    <div className="absolute inset-[-8px] bg-amber-500/05 rounded-full blur-2xl" />
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/15 to-amber-500/0"
                      style={{ animation: "shine 3s ease-in-out infinite" }}
                    />
                  </motion.div>
                )}

                <motion.span
                  className="hidden md:inline relative z-10 tracking-wider uppercase text-xs"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {item.name}
                </motion.span>
                <motion.span
                  className="md:hidden relative z-10"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon size={18} strokeWidth={2.5} />
                </motion.span>

                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 bg-white/5 rounded-full -z-10"
                    />
                  )}
                </AnimatePresence>

                {isActive && (
                  <motion.div
                    layoutId="anime-mascot-aura"
                    className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  >
                    <div className="relative w-12 h-12">
                      <motion.div
                        className="absolute w-10 h-10 bg-amber-400 rounded-full left-1/2 -translate-x-1/2"
                        animate={
                          hoveredTab
                            ? {
                                scale: [1, 1.1, 1],
                                rotate: [0, -5, 5, 0],
                                transition: { duration: 0.5, ease: "easeInOut" }
                              }
                            : {
                                y: [0, -3, 0],
                                transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                              }
                        }
                      >
                        <motion.div
                          className="absolute w-2 h-2 bg-[#02040A] rounded-full"
                          animate={
                            hoveredTab
                              ? { scaleY: [1, 0.2, 1], transition: { duration: 0.2, times: [0, 0.5, 1] } }
                              : {}
                          }
                          style={{ left: "25%", top: "40%" }}
                        />
                        <motion.div
                          className="absolute w-2 h-2 bg-[#02040A] rounded-full"
                          animate={
                            hoveredTab
                              ? { scaleY: [1, 0.2, 1], transition: { duration: 0.2, times: [0, 0.5, 1] } }
                              : {}
                          }
                          style={{ right: "25%", top: "40%" }}
                        />
                        <motion.div
                          className="absolute w-4 h-2 border-b-2 border-[#02040A] rounded-full"
                          animate={hoveredTab ? { scaleY: 1.5, y: -1 } : { scaleY: 1, y: 0 }}
                          style={{ left: "30%", top: "60%" }}
                        />
                        <AnimatePresence>
                          {hoveredTab && (
                            <>
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                className="absolute -top-1 -right-1 w-2 h-2 text-yellow-300 text-xs"
                              >
                                ✨
                              </motion.div>
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ delay: 0.1 }}
                                className="absolute -top-2 left-0 w-2 h-2 text-yellow-300 text-xs"
                              >
                                ✨
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </motion.div>
                      <motion.div
                        className="absolute -bottom-1 left-1/2 w-4 h-4 -translate-x-1/2"
                        animate={
                          hoveredTab
                            ? {
                                y: [0, -4, 0],
                                transition: { duration: 0.3, repeat: Infinity, repeatType: "reverse" }
                              }
                            : {
                                y: [0, 2, 0],
                                transition: { duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
                              }
                        }
                      >
                        <div className="w-full h-full bg-amber-400 rotate-45 transform origin-center" />
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </Link>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
