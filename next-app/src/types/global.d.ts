interface Window {
  layui: {
    use: (modules: string[], callback: () => void) => void;
    element: {
      render: () => void;
      on: (
        event: string,
        selector: string,
        callback: (data: unknown) => void
      ) => void;
    };
  };
}
