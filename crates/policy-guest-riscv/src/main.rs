#![no_std]
#![no_main]
// Freestanding feasibility ELF, not a runnable SP1/RISC Zero program.
// An adapter must supply that backend's input/journal/halt syscalls (issue 02).

#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {
        core::hint::spin_loop();
    }
}

// Exporting a fixed entry symbol is the only exception to workspace unsafe_code.
#[allow(unsafe_code)]
#[no_mangle]
pub extern "C" fn _start() -> ! {
    let decision = policy_engine_core::evaluate_fields(true, true, 0, 2, 2);
    core::hint::black_box(decision);
    loop {
        core::hint::spin_loop();
    }
}
