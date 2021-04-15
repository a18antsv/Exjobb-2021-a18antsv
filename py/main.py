import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import scipy.stats as stats
import statsmodels.stats.multicomp as multi
from matplotlib.container import BarContainer
from pandas import DataFrame, Series
import enum


class Metric(str, enum.Enum):
    Throughput = "throughput"
    Latency = "latency"


class ErrorType(str, enum.Enum):
    STD = "std"
    SEM = "sem"
    CI = "ci"


# The .csv structure looks like this ["time"], ["producer-service-1_throughput"]....., ["total_throughput"], ["producer-service-1_latency"]....., ["average_latency"]
kafka_file_name: str = "./data/pilot_study/Kafka-5-5-Pilotstudie.csv"
rabbitmq_file_name: str = "./data/pilot_study/RabbitMQ-5-5-Pilotstudie.csv"
img_output_folder: str = "./data/pilot_study/img/"
metric: Metric = Metric.Latency  # The metric to graph from the files
error_type: ErrorType = ErrorType.STD  # The error type to show in bar graph
only_total_average = True  # Show only data in total throughput column / average latency column if true otherwise show all throughput/latency columns (every producer) except total/average
remove_tail: int = 10  # The number of values to remove from the beginning of data (producers produce before consumer is ready causing low throughput and high latency in beginning of experiment)
remove_head: int = 10  # The number of values to remove from head of data
confidence_level: float = 0.95

total_average: str = "total" if metric == Metric.Throughput else "average"
colors: tuple = ("#0D95BC", "#A2B969", "#EBCB38", "#F36F13", "#C13018", "#063951")

kafka_data: DataFrame = pd.read_csv(kafka_file_name)
rabbitmq_data: DataFrame = pd.read_csv(rabbitmq_file_name)

columns: list = list(kafka_data.columns)
producer_num: int = int((len(columns) - 3) / 2)

# Filter columns to include only wanted columns based on settings variables
filtered_columns: list = []
for column in columns:
    if metric.value not in column:
        continue
    if not only_total_average:
        if total_average in column:
            continue
        filtered_columns.append(column)
    else:
        if total_average in column:
            filtered_columns.append(column)

data_series: list[Series] = []  # List of pandas Series (Columns in DataFrame)
data_list: list[list] = []  # All pandas Series converted to list to easily remove some head and tail values
labels: list = []
producers_str: str = f" {str(producer_num)} producer(s)" if only_total_average else ""  # Only show number of producers in legend when its the total or average of a number of producers
for column in filtered_columns:
    label = column.replace("_" + metric.value, "").capitalize() + producers_str
    labels.append(label + " Kafka")
    data_series.append(kafka_data[column])

    labels.append(label + " RabbitMQ")
    data_series.append(rabbitmq_data[column])

for i, _ in enumerate(data_series):
    data_list.append(data_series[i].tolist()[remove_tail:-remove_head])  # Remove a elements from tail of list : remove b elements from head of list)

# Convert the cleaned lists to pandas Series and put them in the original list of series after clear
data_series.clear()
for column in data_list:
    data_series.append(pd.Series(column))

min_value = min([*map(lambda col: col.min(), data_series)])
max_value = max([*map(lambda col: col.max(), data_series)])
min_length = min([*map(lambda col: len(col), data_series)])
max_length = max([*map(lambda col: len(col), data_series)])


def cm_to_inch(value):
    return value / 2.54


def generate_line_chart(in_data_series: list[Series]) -> None:
    plt.figure(figsize=(cm_to_inch(24), cm_to_inch(12)))
    for index, _ in enumerate(in_data_series):
        y = in_data_series[index]
        x = range(1, len(y) + 1)  # First data point at 1 instead of 0
        plt.plot(x, y, label=labels[index], linewidth="2", color=colors[index])

    plt.xlabel("Message aggregation (#)")
    plt.ylabel("Throughput (msgs/sec)" if metric == Metric.Throughput else "Latency (ms)")
    plt.title(f"{metric.value.capitalize()} data {producer_num} producer(s)")
    plt.legend()
    plt.grid(True)
    plt.ylim(ymin=0)
    plt.xlim(xmin=0, xmax=max_length - (remove_head + remove_tail))
    plt.savefig(f"{img_output_folder}line-{metric}-{producer_num}producers.png", bbox_inches="tight", dpi=150)
    plt.show()


def mean_confidence_interval(data, confidence=0.95) -> tuple:
    a = 1.0 * np.array(data)
    n = len(a)
    m, se = np.mean(a), stats.sem(a)
    h = se * stats.t.ppf((1 + confidence) / 2., n - 1)
    return -h, +h


def generate_bar_chart(in_data_series) -> None:
    bar_width: float = 0.3

    means: list[float] = []
    stds: list[float] = []
    sems: list[float] = []
    cis: list[float] = []

    for series in in_data_series:
        means.append(series.mean())
        stds.append(series.std())
        sems.append(series.sem())
        cis.append(mean_confidence_interval(series)[1])

    yerr: list[float] = stds if error_type.value == "std" else (sems if error_type.value == "sem" else cis)

    bars_order: range = range(len(labels))
    interval_capsize: int = 10

    plt.figure(figsize=(cm_to_inch(24), cm_to_inch(12)))
    bar_plot: BarContainer = plt.bar(bars_order, means, yerr=yerr, edgecolor="black", width=bar_width, capsize=interval_capsize, color=colors)

    for index, rect in enumerate(bar_plot):
        x_middle = rect.get_x() + rect.get_width() / 2.0
        y_middle = rect.get_y() + rect.get_height() / 2.0
        plt.text(x_middle, y_middle + rect.get_height() / 3, f"Mean: {round(means[index], 4)}", ha="center",
                 va="center", fontsize=12)
        plt.text(x_middle, y_middle - rect.get_height() / 3, f"{error_type.value.upper()}: {round(yerr[index], 4)}",
                 ha="center", va="center", fontsize=12)

    plt.xticks(range(len(labels)), labels)

    plt.ylabel("Throughput (msgs/sec)" if metric == Metric.Throughput else "Latency (ms)")
    plt.xlabel("Message broker and producers")
    plt.title(f"{metric.value.capitalize()} data {producer_num} producer(s) | Means/{error_type.value.upper()}s Comparison")
    plt.ylim(ymin=0)
    plt.savefig(f"{img_output_folder}bar-{metric}-{producer_num}producers.png", bbox_inches="tight", dpi=150)
    plt.show()


def anova(in_data_series: list[Series]) -> None:
    if len(in_data_series) < 2:
        print("Anova test requires at least two groups")
        return

    statistic, pvalue = stats.f_oneway(*in_data_series)

    print(f"ANOVA Statistic {str(statistic)} and p-value {str(pvalue)}")
    if pvalue < (1 - confidence_level):
        print("The means are different")
    else:
        print("No difference in means")


def tukey_test(in_data_series: list[Series]) -> None:
    df: DataFrame = pd.DataFrame()

    if len(in_data_series) < 3:
        print("Tukey test requires at least 3 groups")
        return

    for index in range(len(in_data_series)):
        df[labels[index]] = in_data_series[index]

    stacked_data = df.stack().reset_index()
    stacked_data = stacked_data.rename(columns={'level_0': 'id', 'level_1': 'treatment', 0: 'result'})

    res2 = multi.pairwise_tukeyhsd(stacked_data['result'], stacked_data['treatment'])
    print(res2)

    res2.plot_simultaneous()

    grand_mean = stacked_data['result'].values.mean()
    plt.vlines(x=grand_mean, ymin=-0.5, ymax=4.5, color="red")

    plt.show()


generate_line_chart(data_series)
generate_bar_chart(data_series)
anova(data_series)
tukey_test(data_series)
