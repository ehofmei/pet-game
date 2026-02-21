export type TabOption<T extends string> = {
	key: T
	label: string
}

type TabNavProps<T extends string> = {
	tabs: ReadonlyArray<TabOption<T>>
	activeTab: T
	onTabChange: (tab: T) => void
}

export const TabNav = <T extends string>({ tabs, activeTab, onTabChange }: TabNavProps<T>) => {
	return (
		<nav className="tab-nav" aria-label="Main tabs">
			{tabs.map((tab) => {
				const isActive = tab.key === activeTab
				return (
					<button
						key={tab.key}
						type="button"
						className={`tab-button${isActive ? ' is-active' : ''}`}
						onClick={() => onTabChange(tab.key)}
						aria-current={isActive ? 'page' : undefined}
					>
						{tab.label}
					</button>
				)
			})}
		</nav>
	)
}
