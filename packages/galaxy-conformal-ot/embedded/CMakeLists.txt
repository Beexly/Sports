cmake_minimum_required(VERSION 3.20)
project(gsi_embedded_braid_kernel VERSION 5.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(MSVC)
    add_compile_options(/W4 /O2 /GR- /EHs-c-)
else()
    add_compile_options(-Wall -Wextra -O3 -fno-exceptions -fno-rtti -ffast-math)
endif()

add_library(gsi_embedded_braid_kernel STATIC
    gsi_embedded_braid_kernel.cpp
    gsi_cte_viscoelastic_waveguide_kernel.cpp
)
target_include_directories(gsi_embedded_braid_kernel PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

enable_testing()
add_executable(embedded_kernel_tests
    tests/embedded_kernel_tests.cpp
)
target_link_libraries(embedded_kernel_tests PRIVATE gsi_embedded_braid_kernel)
add_test(NAME EmbeddedKernelTests COMMAND embedded_kernel_tests)
