#![no_main]
#![no_std]
extern crate alloc;

use lab_statement::{evaluate_signed, SignedRequest};
use policy_statement::canonical_bytes;
use risc0_zkvm::guest::env;

risc0_zkvm::guest::entry!(main);

fn main() {
    let length: u32 = env::read();
    assert!(length <= 16_384, "input size limit");
    let mut bytes = alloc::vec![0u8; length as usize];
    env::read_slice(&mut bytes);
    let input: SignedRequest = serde_json::from_slice(&bytes).expect("invalid input encoding");
    let journal = evaluate_signed(&input).expect("invalid signed statement");
    env::commit_slice(&canonical_bytes(&journal).expect("journal encoding"));
}
