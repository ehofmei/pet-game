type TagListProps = {
	tags: string[]
	emptyLabel?: string
}

export const TagList = ({ tags, emptyLabel = 'No tags' }: TagListProps) => {
	if (tags.length === 0) {
		return (
			<div className="tag-list">
				<span className="tag-chip tag-chip-empty">{emptyLabel}</span>
			</div>
		)
	}

	return (
		<div className="tag-list">
			{tags.map((tag) => (
				<span className="tag-chip" key={tag}>
					{tag}
				</span>
			))}
		</div>
	)
}
