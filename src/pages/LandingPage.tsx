import { Footer } from '@/components/landing/Footer'
import { Hero } from '@/components/landing/Hero'
import { Navbar } from '@/components/landing/Navbar'
import { AgentPreview, EnterpriseSection, Features, FinalCTA, HowItWorks, Stats } from '@/components/landing/Sections'

export function LandingPage() { return <div className="overflow-hidden"><Navbar /><main><Hero /><Stats /><Features /><HowItWorks /><AgentPreview /><EnterpriseSection /><FinalCTA /></main><Footer /></div> }
