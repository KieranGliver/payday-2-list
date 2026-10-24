import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
	readonly children: ReactNode;
}

interface State {
	readonly error: Error | undefined;
}

/**
 * Last line of defence against a blank page.
 *
 * Without this, any throw during render - a malformed API payload reaching a
 * component, a bad catalog invariant - unmounts the whole tree and leaves the
 * user staring at white with nothing in the UI to explain it.
 *
 * Still a class component: React has no hook equivalent of
 * componentDidCatch.
 */
export class ErrorBoundary extends Component<Props, State> {
	override state: State = { error: undefined };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	override componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('render failed', error, info.componentStack);
	}

	override render() {
		const { error } = this.state;
		if (!error) return this.props.children;

		return (
			<div className="min-h-dvh bg-background p-6 text-foreground">
				<div className="mx-auto max-w-xl space-y-3">
					<h1 className="text-xl font-bold tracking-wide uppercase">
						Something broke
					</h1>
					<p className="text-sm text-muted-foreground">
						The page failed to render. The details below are also in the browser
						console.
					</p>
					<pre className="overflow-x-auto rounded-md border bg-card p-3 text-xs">
						{error.message}
					</pre>
					<button
						type="button"
						className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
						onClick={() => window.location.reload()}
					>
						Reload
					</button>
				</div>
			</div>
		);
	}
}
