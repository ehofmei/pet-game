import type { ReactNode } from 'react'

export type ImageInfoCardBadgeTone = 'primary' | 'secondary'

export type ImageInfoCardBadge = {
	label: string
	tone?: ImageInfoCardBadgeTone
}

type ImageInfoCardProps = {
	title: string
	subtitle?: string
	imageUrl?: string | null
	imageAlt: string
	placeholderLabel?: string
	badges?: ImageInfoCardBadge[]
	content?: ReactNode
	footer?: ReactNode
	className?: string
}

export const ImageInfoCard = ({
	title,
	subtitle,
	imageUrl,
	imageAlt,
	placeholderLabel = 'No Photo',
	badges = [],
	content,
	footer,
	className,
}: ImageInfoCardProps) => {
	return (
		<article className={`image-info-card${className ? ` ${className}` : ''}`}>
			<div className="image-info-card-media">
				{imageUrl ? <img src={imageUrl} alt={imageAlt} /> : <span>{placeholderLabel}</span>}
				{badges.length > 0 ? (
					<div className="image-info-card-badges">
						{badges.map((badge, index) => (
							<span
								key={`${badge.label}-${index}`}
								className={`image-info-card-badge${badge.tone === 'secondary' ? ' is-secondary' : ''}`}
							>
								{badge.label}
							</span>
						))}
					</div>
				) : null}
			</div>

			<div className="image-info-card-body">
				<h3>{title}</h3>
				{subtitle ? <p className="image-info-card-subtitle">{subtitle}</p> : null}
				{content ? <div className="image-info-card-content">{content}</div> : null}
			</div>

			{footer ? <div className="image-info-card-footer">{footer}</div> : null}
		</article>
	)
}
