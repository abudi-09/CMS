export function ProtectedFooter() {
  return (
    <footer className="bg-muted rounded-lg mt-8 p-6">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Divider and copyright */}
        <hr className="my-4 border-muted-foreground/20" />
        <div className="text-xs text-muted-foreground text-center">
          © 2025 University of Gondar. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
