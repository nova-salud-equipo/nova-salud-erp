import { createContext, useContext } from 'react'

export const NavCtx = createContext(() => {})
export const useNav = () => useContext(NavCtx)
