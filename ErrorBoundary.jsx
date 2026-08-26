import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Unexpected application error." };
  }
  componentDidCatch(error) {
    console.error("DevMarket UI error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24}}>
          <section style={{maxWidth:560,textAlign:"center"}}>
            <h1>Something went wrong</h1>
            <p>Please refresh the page and try again. Your account and purchases are safe.</p>
            <button onClick={() => window.location.reload()}>Refresh</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}