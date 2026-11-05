cmake_minimum_required(VERSION 3.20)
project(gsi_embedded_kernel LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_compile_options(-fno-exceptions -fno-rtti -Wall -Wextra -O3)

add_executable(gsi_embedded_verification
    gsi_embedded_braid_kernel.cpp
    tests/embedded_kernel_tests.cpp
)

target_include_directories(gsi_embedded_verification PRIVATE .)

if(CMAKE_CROSSCOMPILING)
    target_link_options(gsi_embedded_verification PRIVATE
        -Wl,--gc-sections
        -nostartfiles
        --specs=nano.specs
    )
endif()
