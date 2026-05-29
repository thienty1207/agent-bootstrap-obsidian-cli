use std::env;
use std::io::{self, Read};

fn main() {
    let command = env::args().nth(1).unwrap_or_else(|| "probe".to_string());
    let mut input = String::new();
    let _ = io::stdin().read_to_string(&mut input);

    match command.as_str() {
        "index" | "probe" => {
            println!(
                "{{\"provider\":\"rust\",\"diagnostics\":[\"Rust vault-indexer probe succeeded; Node remains source-compatible fallback.\"]}}"
            );
        }
        _ => {
            eprintln!("unknown command: {}", command);
            std::process::exit(2);
        }
    }
}
