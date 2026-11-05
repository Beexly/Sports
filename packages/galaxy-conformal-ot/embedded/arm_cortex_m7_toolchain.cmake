# CMake toolchain file for bare-metal ARM Cortex-M7 cross-compilation
set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_SYSTEM_PROCESSOR arm)

set(CMAKE_C_COMPILER arm-none-eabi-gcc)
set(CMAKE_CXX_COMPILER arm-none-eabi-g++)

set(ARM_M7_FLAGS "-mcpu=cortex-m7 -mfpu=fpv5-d16 -mfloat-abi=hard -mthumb")

set(CMAKE_C_FLAGS_INIT "${ARM_M7_FLAGS} -O3 -Wall -Wextra")
set(CMAKE_CXX_FLAGS_INIT "${ARM_M7_FLAGS} -O3 -Wall -Wextra -fno-exceptions -fno-rtti")

set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_PACKAGE ONLY)
